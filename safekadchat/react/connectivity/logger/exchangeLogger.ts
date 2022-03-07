import Log, { LogWithTimestamp } from "../types/Log";

function queue<T>(maxMessages: number = 50){
    const elements: T[] = []
    return {
        getElements: () => Object.freeze(elements),
        addElement: (element:T) => { 
            elements.unshift(element) 
            if(elements.length > maxMessages)
                elements.pop();
        }
    }
}


function init(){
    const _lastLogsQueue = queue<LogWithTimestamp>();
    const onLogListeners = new Map<number, (log:LogWithTimestamp) => void|Promise<void>>();
    return {
        log(log: Log){ 
            const timestampLog = {...log, timestamp:Date.now()};
            _lastLogsQueue.addElement(timestampLog);
            onLogListeners.forEach(listener => listener(timestampLog));
        },
        getLastLogs(){ return _lastLogsQueue.getElements() },
        addLogListener(logListener: (log:LogWithTimestamp) => void|Promise<void>)   {
            const id = Math.random();
            onLogListeners.set(id, logListener);
            return id;
        },
        removeLogListener(id:number){
            onLogListeners.delete(id)
        }
    }
}
const exchangeLogger = init();
export default exchangeLogger;