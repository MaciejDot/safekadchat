export default interface Address {
     ip:string,
     port:number,
     kind: 'ipv4' | 'ipv6'
}