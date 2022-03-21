import {Buffer} from 'buffer'
export default function encoding(encoding: BufferEncoding){
    return {
         transformToString(data: ArrayBuffer){
            return Buffer.from(data).toString(encoding);
        },
        transformToArrayBuffer(data :string) {
            return new Uint8Array(Buffer.from(data, encoding));
        }
        
    }
}