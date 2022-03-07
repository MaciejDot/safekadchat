function clientInfo(){
    function getClientId(): Int8Array{
        return new Int8Array(20)
    }
    return {
        getClientId
    }
}
export default clientInfo()