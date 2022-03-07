import PrivateKey from "../types/PrivateKey"
import PublicKey from "../types/PublicKey"
import SHA1String from "../types/SHA1String"
import Signature from "../types/Signature"

/*stateless namespace with shared closure*/
export default function encryption(){
    return {
        async generateKey(kind: "ECDSA" | "MCELLEN"): Promise<PrivateKey>{},
        sha1(object: string){
            return "" as SHA1String
        },
        async encrypt(message: string, myKey: PrivateKey, yourPubKey: PublicKey)
        {
            return { encrypted:"", IV:"" };
        },
        async sign(message:string, myKey:PrivateKey): Promise<Signature>
        {
            return {
                signature: "",
                algorithm: "ECDSA"
            } 
        },
        async decrypt(encryptedMessage:string, myKey: PrivateKey, yourPubKey: PublicKey){
            return ""
        },
        async verify(message:string, yourPubKey: PublicKey){
            return true
        }
    }
}