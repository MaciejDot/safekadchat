export default interface PrivateKey{
    privateKey: string,
    publicKey : string,
    algorithm : 'MCELLEN' | 'ECDSA'
}