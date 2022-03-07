import Address from "../types/Address";

function manuallyAddedNodes(){
    let _cache;
    const addedNodes : Address[] = [] 


    return {
        addAddress(address: Address){
            addedNodes.push(address)
        },
        getAddresses(){
            return Object.freeze(addedNodes) 
        }
    }
}
export default manuallyAddedNodes()