// CodeAps Starter Template: JAVA - ADVANCED FOUNDATIONS\n
// --- EXECUTIVE SUITE: JAVA STACK ARCHITECTURE ---
// Neatly explained Stack with Generic implementation and Menu logic

import java.util.Scanner;

class Stack<T> {
    private Object[] elements;
    private int top = -1;
    private int capacity;

    public Stack(int cap) {
        this.capacity = cap;
        this.elements = new Object[cap];
    }

    public void push(T val) {
        if (top < capacity - 1) {
            elements[++top] = val;
            System.out.println("Neural Link Established: " + val);
        } else {
            System.err.println("Critical Error: Buffer Overflow");
        }
    }

    @SuppressWarnings("unchecked")
    public T pop() {
        if (top >= 0) return (T)elements[top--];
        System.err.println("Critical Error: Buffer Underflow");
        return null;
    }

    @SuppressWarnings("unchecked")
    public T peek() {
        if (top >= 0) return (T)elements[top];
        return null;
    }

    public static void main(String[] args) {
        Stack<String> stack = new Stack<>(5);
        Scanner sc = new Scanner(System.in);
        
        while(true) {
            System.out.println("\n--- JAVA NEURAL LAYER ---");
            System.out.println("1. Push | 2. Pop | 3. Peek | 4. Exit");
            String choice = sc.nextLine();
            
            if (choice.equals("1")) {
                System.out.print("Enter value: ");
                stack.push(sc.nextLine());
            } else if (choice.equals("2")) {
                System.out.println("Popped: " + stack.pop());
            } else if (choice.equals("3")) {
                System.out.println("Top: " + stack.peek());
            } else if (choice.equals("4")) break;
        }
    }
}
