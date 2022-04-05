import Address from "../../../types/Address";


function bootstrapStorage() {
    const _staticBootstrapNodes = [{
        ip: '192.168.1.123',
        kind: 'ipv4',
        port: 16000}] as const;
    
    const _foundBootstrapNodes: Address[ ]= [];


    function allShuffledNodes(){
        const allNodes = [..._staticBootstrapNodes, ..._foundBootstrapNodes];
        for (let i = allNodes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allNodes[i], allNodes[j]] = [allNodes[j], allNodes[i]];
        }
        return allNodes;
    }

    function getRandomBootstrapNodesSeries() {
        return allShuffledNodes();
    }

    return {
        getRandomBootstrapNodesSeries
    }
}

export default bootstrapStorage;