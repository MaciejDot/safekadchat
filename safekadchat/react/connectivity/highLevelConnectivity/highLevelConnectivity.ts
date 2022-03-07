import Address from "../types/Address";
import kademliaLevelSocket from "./kademlia/kademliaLevelSocket";

function highLevelConnectivity(){
    const {buildKademlia, getICECandidates,pingNode,pingAddress, sendToLowNode,storeSigned,onMessage} = kademliaLevelSocket;
    //later for abstractions of garlic routing 
    return {
        init(){
            //build all dependencies to work with kad protocol
            buildKademlia()
        },
        getICECandidates,
        pingNode,
        pingAddress,
        sendToLowNode,
        onMessage
    }
}
export default highLevelConnectivity();