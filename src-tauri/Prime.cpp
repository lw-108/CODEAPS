#include <iostream>
#include <thread>
#include <vector>
#include <atomic>
#include <chrono>

using namespace std;

atomic<bool> running(true);

// CPU-heavy computation
unsigned long long heavyComputation(unsigned long long x) {
    for (int i = 0; i < 5000000; i++) {
        x = x * 1664525 + 1013904223;
        x ^= (x >> 16);
    }
    return x;
}

void worker(int id) {
    unsigned long long value = id;

    while (running.load()) {
        value = heavyComputation(value);
    }

    cout << "Thread " << id << " finished." << endl;
}

int main() {
    unsigned int numThreads = thread::hardware_concurrency();
    if (numThreads == 0) numThreads = 4;

    cout << "🚀 Starting load on " << numThreads << " threads..." << endl;

    vector<thread> threads;

    // Stop after 10 seconds (SAFE)
    thread stopper([]() {
        this_thread::sleep_for(chrono::seconds(10));
        running.store(false);
        cout << "🛑 Stopping load..." << endl;
    });

    // Launch workers
    for (unsigned int i = 0; i < numThreads; i++) {
        threads.emplace_back(worker, i);
    }

    for (auto &t : threads) {
        t.join();
    }

    stopper.join();

    cout << "✅ Load test completed safely." << endl;
    return 0;
}