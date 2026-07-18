// CodeAps Starter Template: JAVASCRIPT - ADVANCED FOUNDATIONS\n
// --- EXECUTIVE SUITE: ASYNC TASK HUB ---
// Real-world pattern for handling asynchronous task queues

class TaskHub {
    constructor() {
        this.queue = [];
        this.active = false;
    }

    addTask(name, duration) {
        console.log(`[QUEUED] ${name} (${duration}ms)`);
        this.queue.push({ name, duration });
        if (!this.active) this.process();
    }

    async process() {
        if (this.queue.length === 0) {
            this.active = false;
            console.log("[IDLE] System ready.");
            return;
        }

        this.active = true;
        const task = this.queue.shift();
        console.log(`[START] Processing ${task.name}...`);
        
        await new Promise(r => setTimeout(r, task.duration));
        
        console.log(`[COMPLETE] Finished ${task.name}`);
        this.process();
    }
}

const hub = new TaskHub();
hub.addTask("Neural Sync", 2000);
hub.addTask("LSP Boot", 1000);
hub.addTask("IO Flush", 500);
