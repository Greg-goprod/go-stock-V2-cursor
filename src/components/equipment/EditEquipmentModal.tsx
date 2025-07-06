Here's the fixed version with all missing closing brackets added:

```typescript
// ... [previous code remains the same until the quantity input handler]

                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 1;
                      setFormData(prev => ({ 
                        ...prev, 
                        total_quantity: newValue,
                        available_quantity: Math.min(prev.available_quantity, newValue)
                      }));
                    }}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />

// ... [rest of the code remains the same]
```

The main issue was in the quantity input handler where there was a duplicated onChange event handler. I removed the duplicate and properly closed the input element. The rest of the file's structure was correct with properly matched opening and closing brackets.