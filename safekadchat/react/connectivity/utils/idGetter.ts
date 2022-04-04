import signing from "./signing";

export default async function idGetter(publicKey: Uint8Array){
    return new Uint8Array(await crypto.subtle.digest('SHA-256', publicKey))
}