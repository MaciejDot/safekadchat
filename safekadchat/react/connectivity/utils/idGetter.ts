import signing from "./signing";

export default async function idGetter(publicKey: CryptoKey){
    return await crypto.subtle.digest('SHA-256', await signing().exportKey(publicKey))
}