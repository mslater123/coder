import unittest
from new import main_function

class TestMainFunction(unittest.TestCase):
    """Test suite for `main_function`."""

    def test_example(self):
        """Verify that `main_function` returns a non‑empty result."""
        # Call the function under test.
        result = main_function()

        # Ensure the function does not return None and provides expected output.
        self.assertIsNotNone(result)
        self.assertEqual(result, 'Hello from main_function!')

if __name__ == '__main__':
    unittest.main()