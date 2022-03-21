/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
//import singleSocketMultiplexer from './react/connectivity/highLevelConnectivity/kademlia/encryptedConnection/connection/singleSocketMultiplexer';
import Address from './react/connectivity/types/Address';
import * as forge from 'node-forge'
import PolyfillCrypto from 'react-native-webview-crypto'
import 'react-native-get-random-values'
import encryption from './react/connectivity/utils/encryption';
import wrapping from './react/connectivity/utils/wrapping';
const Section: React.FC<{
  title: string;
}> = ({children, title}) => {
  const isDarkMode = useColorScheme() === 'dark';
 
  return (
    <View style={styles.sectionContainer}>
    
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
};

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [array, setArray] = useState<Address[]>([])
  
  useEffect(()=>{
   // singleSocketMultiplexer.getICECandidates(true).then(ice => setArray(ice))
  },[])

  useEffect(()=>{
    
   // console.log(crypto, crypto.subtle)
    init()  },[])

  async function init(){
    const enc = encryption();
    const bobKey = await enc.generateKey();
    const aliceKey = await enc.generateKey();
    const secretAlice  = await enc.secret(bobKey.publicKey, aliceKey.privateKey);
    const secretBob = await enc.secret(aliceKey.publicKey, bobKey.privateKey) ;
    const encrypted =  await enc.encryptString('hey', secretAlice);
    const decrypted = await enc.decryptString(encrypted, secretBob);
   const pkdf2 =await wrapping().getWrapingKey("any", wrapping().getSalt())
    console.log(pkdf2);
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
            {array.map(elem => <Text key={elem.ip}>{elem.ip}:{elem.port}</Text>)}
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',  
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});
function Wrapper(){
  return <>
    <PolyfillCrypto/>
    <App/>
  </>
}

export default Wrapper;
