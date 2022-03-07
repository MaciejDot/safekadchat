import SHA1String from "../types/SHA1String"

function hashing(){
    function sha1String(objectToDigest: any): SHA1String {
        return ""
    }

    function sha1Array(objectToDigest: any): Int8Array {
        return new Int8Array(20)
    }

    function transformToString(sha: Int8Array): SHA1String{
        return "";
    }

    function transformToArrayBuffer(sha :string): Int8Array {
        return new Int8Array(20)
    }
    
    return { sha1Array, sha1String, transformToArrayBuffer, transformToString}
}

export default hashing();