// CodeAps Starter Template: C - ADVANCED FOUNDATIONS\n
// --- EXECUTIVE SUITE: C DYNAMIC STACK ---
// High-performance manual memory management example

#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *array;
    int top;
    int capacity;
} Stack;

Stack* createStack(int cap) {
    Stack *s = (Stack*)malloc(sizeof(Stack));
    s->array = (int*)malloc(cap * sizeof(int));
    s->top = -1;
    s->capacity = cap;
    return s;
}

void push(Stack *s, int val) {
    if (s->top < s->capacity - 1) {
        s->array[++(s->top)] = val;
        printf("Pushed: %d\n", val);
    }
}

int pop(Stack *s) {
    if (s->top >= 0) {
        return s->array[(s->top)--];
    }
    return -1;
}

int main() {
    Stack *myStack = createStack(10);
    push(myStack, 42);
    push(myStack, 1337);
    
    printf("Popped: %d\n", pop(myStack));
    return 0;
}
