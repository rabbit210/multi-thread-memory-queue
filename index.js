'use strict';

class Queue {
    get length() {
        let inProcess = 0;
        for(let p of this.processing) inProcess += p.length;
        return inProcess+this.tasks.length;
    }

    constructor(count) {
        this.tasks = [];
        this.processing = [];
        this.maxCount = count || 1;
    }

    process(threadId) {
        if(!this.tasks.length || this.thread(threadId).length >= this.maxCount) return;
        let task = this.shiftTask(threadId);
        if(!task) return;

        this.thread(threadId).push(task);

        //Handler must be promise
        task.handler(task.data).then(result => {
            if(task.callback) task.callback(null, task.data, result);
            this.complete(task);
        }).catch(err => {
            if(task.callback) task.callback(err, task.data);
            this.complete(task);
        }).catch(err => {
            console.error(err);
            this.complete(task);
        })
    }

    complete(task) {
        let index = this.thread(task.threadId).findIndex(item => item === task );
        if(index > -1) this.thread(task.threadId).splice(index, 1);

        this.process(task.threadId);
    }

    push({thread, data, handler, callback}) {
        if(!data.id) throw new Error('No id defined for data');

        let threadId = thread || 0;

        if(!this.tasks.find(item => item.data.id === data.id) && !this.thread(threadId).find(item => item.data.id === data.id)) {
            this.tasks.push({threadId, data, handler, callback});
        }

        this.process(threadId);
    }

    pushOrUpdate({thread, data, test, handler, callback}) {
        if(!data.id) throw new Error('No id defined for data');

        let threadId = thread || 0;

        let taskInQueue = this.tasks.find(item => item.data.id === data.id);
        let taskInProcess = this.thread(threadId).find(item => item.data.id === data.id);

        if((!taskInProcess || (taskInProcess && test(taskInProcess.data, data))) && (!taskInQueue || (taskInQueue && test(taskInQueue.data, data)))) {
            if(taskInQueue) {
                taskInQueue.data = data;
                taskInQueue.handler = handler;
                taskInQueue.callback = callback;
            } else {
                this.tasks.push({threadId, data, handler, callback});
            }
        }

        this.process(threadId);
    }

    shiftTask(threadId) {
        let index = this.tasks.findIndex(task => task.threadId === threadId);
        if(index < 0) return null;
        return this.tasks.splice(index, 1)[0];
    }

    thread(id) {
        if(!this.processing[id]) {
            this.processing[id] = [];
        }

        return this.processing[id];
    }

    remove(test) {
        let index = this.tasks.findIndex(item => test(item.data));
        if(index > -1) this.tasks.splice(index, 1);
    }

    removeById(id) {
        let index = this.tasks.findIndex(item => item.data.id === id);
        if(index > -1) this.tasks.splice(index, 1);
    }
}

module.exports = Queue;