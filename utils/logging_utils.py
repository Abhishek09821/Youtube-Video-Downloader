"""
Structured Logging Utilities
Provides consistent logging across the application with performance metrics.
"""

import logging
import time
from functools import wraps
from typing import Callable, Any
import sys

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for the given module name."""
    return logging.getLogger(name)


def log_performance(logger: logging.Logger):
    """
    Decorator to log function execution time.
    
    Usage:
        @log_performance(logger)
        def my_function():
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start_time
                logger.info(f"{func.__name__} completed in {elapsed:.2f}s")
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(f"{func.__name__} failed after {elapsed:.2f}s: {str(e)}")
                raise
        return wrapper
    return decorator


class PerformanceMetrics:
    """Context manager for tracking and logging performance metrics."""
    
    def __init__(self, logger: logging.Logger, operation: str):
        self.logger = logger
        self.operation = operation
        self.start_time = None
        self.metrics = {}
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.info(f"Starting: {self.operation}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        if exc_type:
            self.logger.error(
                f"{self.operation} failed after {elapsed:.2f}s: {exc_val}"
            )
        else:
            metric_str = ", ".join([f"{k}={v}" for k, v in self.metrics.items()])
            self.logger.info(
                f"{self.operation} completed in {elapsed:.2f}s ({metric_str})"
            )
    
    def add_metric(self, key: str, value: Any):
        """Add a metric to be logged at completion."""
        self.metrics[key] = value
