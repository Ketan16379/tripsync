package com.tripsync.expense;

import com.tripsync.expense.service.ExpenseCalculationEngine;
import com.tripsync.expense.service.ExpenseCalculationEngine.ComputedSplit;
import com.tripsync.expense.service.ExpenseCalculationEngine.SettlementTransfer;
import com.tripsync.expense.service.ExpenseCalculationEngine.SplitInput;
import com.tripsync.expense.service.ExpenseCalculationEngine.SplitMethod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class ExpenseCalculationEngineTest {

    private ExpenseCalculationEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ExpenseCalculationEngine();
    }

    @Test
    @DisplayName("Equal split of INR 5,000 among 5 members equals INR 1,000 each")
    void testEqualSplitFiveMembers() {
        List<SplitInput> members = List.of(
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO),
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO),
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO),
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO),
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO)
        );
        List<ComputedSplit> splits = engine.computeSplits(new BigDecimal("5000.00"), SplitMethod.EQUAL, members);
        assertEquals(5, splits.size());
        splits.forEach(s -> assertEquals(new BigDecimal("1000.00"), s.owedAmount()));
    }

    @Test
    @DisplayName("Rounding precision: INR 100.00 split equally among 3 members reconciles exact paise")
    void testEqualSplitRoundingPrecision() {
        List<SplitInput> members = List.of(
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO),
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO),
                new SplitInput(UUID.randomUUID(), BigDecimal.ZERO)
        );
        List<ComputedSplit> splits = engine.computeSplits(new BigDecimal("100.00"), SplitMethod.EQUAL, members);
        BigDecimal total = splits.stream().map(ComputedSplit::owedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("100.00"), total);
        assertEquals(new BigDecimal("33.34"), splits.get(0).owedAmount());
        assertEquals(new BigDecimal("33.33"), splits.get(1).owedAmount());
        assertEquals(new BigDecimal("33.33"), splits.get(2).owedAmount());
    }

    @Test
    @DisplayName("Transitive debt simplification: A owes B 1000 and B owes C 1000 -> A pays C 1000")
    void testDebtSimplificationTransitive() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        UUID userC = UUID.randomUUID();

        Map<UUID, BigDecimal> balances = new LinkedHashMap<>();
        balances.put(userA, new BigDecimal("-1000.00"));
        balances.put(userB, new BigDecimal("0.00"));
        balances.put(userC, new BigDecimal("1000.00"));

        List<SettlementTransfer> transfers = engine.simplifyDebts(balances);
        assertEquals(1, transfers.size());
        assertEquals(userA, transfers.get(0).fromUserId());
        assertEquals(userC, transfers.get(0).toUserId());
        assertEquals(new BigDecimal("1000.00"), transfers.get(0).amount());
    }
}
