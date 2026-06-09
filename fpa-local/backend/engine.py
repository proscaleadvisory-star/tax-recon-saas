"""
engine.py
=========
Core Local-First FP&A Multi-Dimensional Modeling & Calculation Engine

Features:
    1. MultiDimensionalVariable: 4D NumPy arrays (Entities x Departments x Accounts x TimePeriods)
    2. QueryPlanner: DAG dependency builder with Topological Sort
    3. CircularSolver: Newton-Raphson iterative solver for circular references
    4. Aggregation & Allocation Layer (BY_SUM, BY_CONSTANT)
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Set, Tuple, Callable
import numpy as np

logger = logging.getLogger("fpa-engine")

# ══════════════════════════════════════════════════════════════════════════════
# MULTI-DIMENSIONAL VARIABLE MODEL
# ══════════════════════════════════════════════════════════════════════════════

class MultiDimensionalVariable:
    """
    Represents a multi-dimensional financial variable stored as a 4D NumPy array.
    Dimensions:
        Dim 0: Entity (E)
        Dim 1: Department (D)
        Dim 2: Account (A)
        Dim 3: TimePeriod (T)
    """

    def __init__(
        self,
        name: str,
        entities: List[str],
        departments: List[str],
        accounts: List[str],
        periods: List[str],
        initial_value: float = 0.0,
    ) -> None:
        self.name = name
        self.entities = entities
        self.departments = departments
        self.accounts = accounts
        self.periods = periods

        # Dimension index maps for constant-time lookup
        self.entity_idx = {e: i for i, e in enumerate(entities)}
        self.dept_idx = {d: i for i, d in enumerate(departments)}
        self.acct_idx = {a: i for i, a in enumerate(accounts)}
        self.period_idx = {p: i for i, p in enumerate(periods)}

        self.shape = (len(entities), len(departments), len(accounts), len(periods))
        self.data = np.full(self.shape, initial_value, dtype=np.float64)

    def get_slice(
        self,
        entity: Optional[str] = None,
        department: Optional[str] = None,
        account: Optional[str] = None,
        period: Optional[str] = None,
    ) -> np.ndarray:
        """Slice the 4D array by dimensions. Returns a view/copy of data."""
        slc = [slice(None)] * 4
        if entity is not None:
            slc[0] = self.entity_idx[entity]
        if department is not None:
            slc[1] = self.dept_idx[department]
        if account is not None:
            slc[2] = self.acct_idx[account]
        if period is not None:
            slc[3] = self.period_idx[period]
        return self.data[tuple(slc)]

    def set_value(
        self,
        value: float | np.ndarray,
        entity: Optional[str] = None,
        department: Optional[str] = None,
        account: Optional[str] = None,
        period: Optional[str] = None,
    ) -> None:
        """Assign values to a slice of the 4D array."""
        slc = [slice(None)] * 4
        if entity is not None:
            slc[0] = self.entity_idx[entity]
        if department is not None:
            slc[1] = self.dept_idx[department]
        if account is not None:
            slc[2] = self.acct_idx[account]
        if period is not None:
            slc[3] = self.period_idx[period]
        self.data[tuple(slc)] = value


# ══════════════════════════════════════════════════════════════════════════════
# QUERY PLANNER & DAG TOPOLOGICAL SORT
# ══════════════════════════════════════════════════════════════════════════════

class FormulaNode:
    """Represents a formula / calculation node in the FP&A DAG."""

    def __init__(
        self,
        target_var: str,
        inputs: List[str],
        calc_fn: Callable[[Dict[str, np.ndarray]], np.ndarray],
    ) -> None:
        self.target_var = target_var
        self.inputs = inputs
        self.calc_fn = calc_fn


class QueryPlanner:
    """Constructs a dependency DAG and plans the calculation order."""

    def __init__(self) -> None:
        self.formulas: Dict[str, FormulaNode] = {}
        self.dependencies: Dict[str, Set[str]] = {}

    def add_formula(
        self,
        target_var: str,
        inputs: List[str],
        calc_fn: Callable[[Dict[str, np.ndarray]], np.ndarray],
    ) -> None:
        """Add a formula node to the query plan."""
        self.formulas[target_var] = FormulaNode(target_var, inputs, calc_fn)
        self.dependencies[target_var] = set(inputs)

    def get_calculation_order(self) -> List[str]:
        """
        Perform a Topological Sort (Kahn's Algorithm) on variables
        to return the sequence of calculations.
        """
        # Determine all unique variables in the system
        all_vars = set(self.formulas.keys())
        for inputs in self.dependencies.values():
            all_vars.update(inputs)

        # Build adjacency list (dependents) and in-degree counts
        in_degree = {v: 0 for v in all_vars}
        adj = {v: set() for v in all_vars}

        for target, inputs in self.dependencies.items():
            for input_var in inputs:
                adj[input_var].add(target)
                in_degree[target] += 1

        # Queue of nodes with in-degree 0 (no dependencies)
        queue = [v for v in all_vars if in_degree[v] == 0]
        order = []

        while queue:
            curr = queue.pop(0)
            order.append(curr)

            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Detect cycle (if nodes in order is less than all unique nodes)
        if len(order) < len(all_vars):
            cycle_nodes = [v for v, deg in in_degree.items() if deg > 0]
            logger.warning(f"Circular reference detected in nodes: {cycle_nodes}")
            # Circular nodes will be resolved separately using the CircularSolver
            return order, cycle_nodes

        return order, []


# ══════════════════════════════════════════════════════════════════════════════
# NEWTON-RAPHSON CIRCULAR LOOP SOLVER
# ══════════════════════════════════════════════════════════════════════════════

class CircularSolver:
    """
    Newton-Raphson numerical solver designed to resolve circular formulas
    (e.g., Interest Expense looping with Debt Balance).
    Solves f(x) - x = 0.
    """

    def __init__(
        self,
        tolerance: float = 1e-8,
        max_iterations: int = 50,
        epsilon: float = 1e-5,
    ) -> None:
        self.tolerance = tolerance
        self.max_iterations = max_iterations
        self.epsilon = epsilon

    def solve_1d(
        self,
        formula_fn: Callable[[float], float],
        initial_guess: float,
    ) -> float:
        """
        Solves circular system using 1D Newton-Raphson.
        f(x) is the formula evaluation. We want x = f(x) -> f(x) - x = 0.
        """
        x = float(initial_guess)

        for i in range(self.max_iterations):
            fx = formula_fn(x)
            residual = fx - x

            if abs(residual) < self.tolerance:
                logger.debug(f"Circular loop converged in {i} iterations.")
                return x

            # Finite-difference derivative approximation: g(x) = f(x) - x -> g'(x) = f'(x) - 1
            fx_eps = formula_fn(x + self.epsilon)
            f_prime = (fx_eps - fx) / self.epsilon
            g_prime = f_prime - 1.0

            if abs(g_prime) < 1e-12:
                # Fallback to simple fixed-point iteration if derivative is zero (flat slope)
                x = fx
                continue

            x = x - (residual / g_prime)

        logger.warning(f"Circular loop failed to converge. Final residual: {residual:.6f}")
        return x

    def solve_vector(
        self,
        formula_fn: Callable[[np.ndarray], np.ndarray],
        initial_guess: np.ndarray,
    ) -> np.ndarray:
        """Vectorized Newton-Raphson for entire multi-dimensional sheets."""
        x = np.copy(initial_guess)

        for i in range(self.max_iterations):
            fx = formula_fn(x)
            residual = fx - x

            if np.all(np.abs(residual) < self.tolerance):
                logger.debug(f"Vectorized loop converged in {i} iterations.")
                return x

            # Finite difference derivative per cell
            fx_eps = formula_fn(x + self.epsilon)
            f_prime = (fx_eps - fx) / self.epsilon
            g_prime = f_prime - 1.0

            # Safe step (avoid division by zero)
            g_prime[np.abs(g_prime) < 1e-12] = 1.0

            x = x - (residual / g_prime)

        return x


# ══════════════════════════════════════════════════════════════════════════════
# AGGREGATION AND ALLOCATION RULES
# ══════════════════════════════════════════════════════════════════════════════

def aggregate_by_sum(
    parent_var: MultiDimensionalVariable,
    child_vars: List[MultiDimensionalVariable],
) -> None:
    """BY_SUM aggregation: Parent value = sum of child values."""
    parent_var.data.fill(0.0)
    for child in child_vars:
        parent_var.data += child.data


def allocate_by_constant(
    parent_var: MultiDimensionalVariable,
    child_vars: List[MultiDimensionalVariable],
    allocated_delta: float,
) -> None:
    """
    BY_CONSTANT allocation: Allocates a change in the parent variable
    evenly (or proportionally) to all child variables.
    """
    if len(child_vars) == 0:
        return
    share = allocated_delta / len(child_vars)
    for child in child_vars:
        child.data += share
