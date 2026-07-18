// CodeAps Starter Template: PYTHON - ADVANCED FOUNDATIONS\n
# --- EXECUTIVE SUITE: STACK DATA STRUCTURE ---
# Neatly explained Stack implementation with Menu System

class Stack:
    def __init__(self, capacity=10):
        self.stack = []
        self.capacity = capacity

    def is_full(self):
        return len(self.stack) >= self.capacity

    def is_empty(self):
        return len(self.stack) == 0

    def push(self, data):
        if self.is_full():
            print("System Alert: Buffer Overflow")
            return
        self.stack.append(data)
        print(f"Pushed: {data}")

    def pop(self):
        if self.is_empty():
            print("System Alert: Buffer Underflow")
            return None
        return self.stack.pop()

    def peek(self):
        if not self.is_empty():
            return self.stack[-1]
        return None

def main_loop():
    s = Stack(5)
    while True:
        print("\n--- NEURAL STACK MANAGER ---")
        print("1. Push (Initialize Data)")
        print("2. Pop (Purge Data)")
        print("3. Peek (Analyze Top)")
        print("4. Exit")
        choice = input("Select operation: ")

        if choice == '1':
            item = input("Enter data to push: ")
            s.push(item)
        elif choice == '2':
            item = s.pop()
            if item: print(f"Popped: {item}")
        elif choice == '3':
            item = s.peek()
            print(f"Top element: {item}")
        elif choice == '4':
            print("Exiting Neural Manager...")
            break
        else:
            print("Invalid Identity Operation.")

if __name__ == "__main__":
    main_loop()
