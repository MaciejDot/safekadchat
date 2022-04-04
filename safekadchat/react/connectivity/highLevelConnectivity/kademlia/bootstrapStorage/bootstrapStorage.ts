

function bootstrapStorage() {
    const _staticBootstrapNodes = [{
        ip: '192.168.1.123',
        port: 16000}] as const;
    
    const _foundBootstrapNodes: {
        ip:string,
        port:number
    }[ ]= [];

    //first connect to the found bootstrap nodes if failed then connect to the static bootstrap nodes
    function getRandomBootstrapNode() {
        return _foundBootstrapNodes.length > 0 ? _foundBootstrapNodes : _staticBootstrapNodes;
    }

    return {
        getRandomBootstrapNode
    }
}

export default bootstrapStorage();