package com.tripsync.expense.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Core financial calculation engine for TripSync.
 * Enforces strict BigDecimal arithmetic (scale = 2, HALF_UP) with penny/paise
 * remainder reconciliation so splits ALWAYS sum to the exact expense total.
 */
@Service
public class ExpenseCalculationEngine {

    public enum SplitMethod {
        EQUAL, EXACT, PERCENTAGE, SHARES, UNEQUAL
    }

    public record SplitInput(UUID userId, BigDecimal value) {}
    public record ComputedSplit(UUID userId, BigDecimal owedAmount, BigDecimal percentage, Integer shareUnits) {}
    public record SettlementTransfer(UUID fromUserId, UUID toUserId, BigDecimal amount) {}

    public List<ComputedSplit> computeSplits(
            BigDecimal totalAmount,
            SplitMethod method,
            List<SplitInput> participants
    ) {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Expense total amount must be strictly positive.");
        }
        if (participants == null || participants.isEmpty()) {
            throw new IllegalArgumentException("At least one participant is required.");
        }

        BigDecimal normalizedTotal = totalAmount.setScale(2, RoundingMode.HALF_UP);
        int count = participants.size();
        List<ComputedSplit> results = new ArrayList<>(count);

        switch (method) {
            case EQUAL -> {
                BigDecimal baseShare = normalizedTotal.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
                BigDecimal remainder = normalizedTotal.subtract(baseShare.multiply(BigDecimal.valueOf(count)));
                int remainderCents = remainder.movePointRight(2).intValueExact();

                for (int i = 0; i < count; i++) {
                    BigDecimal extra = (i < remainderCents) ? new BigDecimal("0.01") : BigDecimal.ZERO;
                    BigDecimal finalShare = baseShare.add(extra);
                    BigDecimal pct = finalShare.multiply(new BigDecimal("100"))
                            .divide(normalizedTotal, 2, RoundingMode.HALF_UP);
                    results.add(new ComputedSplit(participants.get(i).userId(), finalShare, pct, 1));
                }
            }
            case EXACT, UNEQUAL -> {
                BigDecimal sum = BigDecimal.ZERO;
                for (SplitInput input : participants) {
                    BigDecimal amt = input.value().setScale(2, RoundingMode.HALF_UP);
                    sum = sum.add(amt);
                    BigDecimal pct = amt.multiply(new BigDecimal("100"))
                            .divide(normalizedTotal, 2, RoundingMode.HALF_UP);
                    results.add(new ComputedSplit(input.userId(), amt, pct, null));
                }
                if (sum.compareTo(normalizedTotal) != 0) {
                    throw new IllegalArgumentException(
                            "Exact split amounts (" + sum + ") do not equal total (" + normalizedTotal + ")");
                }
            }
            case PERCENTAGE -> {
                BigDecimal pctSum = participants.stream()
                        .map(SplitInput::value)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .setScale(2, RoundingMode.HALF_UP);
                if (pctSum.compareTo(new BigDecimal("100.00")) != 0) {
                    throw new IllegalArgumentException("Percentages must sum to 100.00%, got " + pctSum);
                }
                BigDecimal runningSum = BigDecimal.ZERO;
                for (int i = 0; i < count; i++) {
                    SplitInput input = participants.get(i);
                    BigDecimal owed;
                    if (i == count - 1) {
                        owed = normalizedTotal.subtract(runningSum);
                    } else {
                        owed = normalizedTotal.multiply(input.value())
                                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                        runningSum = runningSum.add(owed);
                    }
                    results.add(new ComputedSplit(input.userId(), owed, input.value().setScale(2, RoundingMode.HALF_UP), null));
                }
            }
            case SHARES -> {
                BigDecimal totalShares = participants.stream()
                        .map(SplitInput::value)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (totalShares.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("Total share units must be greater than zero.");
                }
                BigDecimal runningSum = BigDecimal.ZERO;
                for (int i = 0; i < count; i++) {
                    SplitInput input = participants.get(i);
                    BigDecimal owed;
                    if (i == count - 1) {
                        owed = normalizedTotal.subtract(runningSum);
                    } else {
                        owed = normalizedTotal.multiply(input.value())
                                .divide(totalShares, 2, RoundingMode.HALF_UP);
                        runningSum = runningSum.add(owed);
                    }
                    BigDecimal pct = owed.multiply(new BigDecimal("100"))
                            .divide(normalizedTotal, 2, RoundingMode.HALF_UP);
                    results.add(new ComputedSplit(input.userId(), owed, pct, input.value().intValue()));
                }
            }
        }
        return results;
    }

    /**
     * Simplifies group debts using a greedy max-creditor / max-debtor matching algorithm.
     * Example: A owes B 1000, B owes C 1000 -> Simplified to: A pays C 1000.
     */
    public List<SettlementTransfer> simplifyDebts(Map<UUID, BigDecimal> netBalances) {
        record PartyBalance(UUID userId, BigDecimal amount) {}

        PriorityQueue<PartyBalance> creditors = new PriorityQueue<>(
                (a, b) -> b.amount().compareTo(a.amount()));
        PriorityQueue<PartyBalance> debtors = new PriorityQueue<>(
                (a, b) -> b.amount().compareTo(a.amount()));

        for (Map.Entry<UUID, BigDecimal> entry : netBalances.entrySet()) {
            BigDecimal bal = entry.getValue().setScale(2, RoundingMode.HALF_UP);
            if (bal.compareTo(new BigDecimal("0.01")) >= 0) {
                creditors.add(new PartyBalance(entry.getKey(), bal));
            } else if (bal.compareTo(new BigDecimal("-0.01")) <= 0) {
                debtors.add(new PartyBalance(entry.getKey(), bal.abs()));
            }
        }

        List<SettlementTransfer> transfers = new ArrayList<>();
        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            PartyBalance creditor = creditors.poll();
            PartyBalance debtor = debtors.poll();

            BigDecimal settled = creditor.amount().min(debtor.amount()).setScale(2, RoundingMode.HALF_UP);
            transfers.add(new SettlementTransfer(debtor.userId(), creditor.userId(), settled));

            BigDecimal creditorRemaining = creditor.amount().subtract(settled);
            BigDecimal debtorRemaining = debtor.amount().subtract(settled);

            if (creditorRemaining.compareTo(new BigDecimal("0.01")) >= 0) {
                creditors.add(new PartyBalance(creditor.userId(), creditorRemaining));
            }
            if (debtorRemaining.compareTo(new BigDecimal("0.01")) >= 0) {
                debtors.add(new PartyBalance(debtor.userId(), debtorRemaining));
            }
        }
        return transfers;
    }
}
