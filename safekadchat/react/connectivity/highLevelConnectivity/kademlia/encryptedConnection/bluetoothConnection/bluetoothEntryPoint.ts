import BleManager from 'react-native-ble-manager';;

export default function bluetoothEntryPoint(){
    // try connect to a all devices and if any of them is a kad node, then connect to it

    async function init( ){
    try{
        await BleManager.start({ showAlert: false });
        // android
        
        //await BleManager.enableBluetooth ();
        
    }
    catch{}
    }
}