//App.js
import React, {useEffect, useState} from "react";
import './App.css';
/* ethers 変数を使えるようにする*/
import { ethers } from "ethers";
/* ABIファイルを含むWavePortal.jsonファイルをインポートする*/
import abi from "./utils/WavePortal.json";

const App = () =>{
  /* ユーザーのパブリックウォレットを保存するために使用する状態変数を定義します */
  const [currentAccount, setCurrentAccount] = useState("");
  /* ユーザーのメッセージを保存するために使用する状態変数を定義します */
  const [messageValue, setMessageValue] = useState("");
  /* 全てのwaveを保存するために使用する状態変数を定義します */
  const [allWaves, setAllWaves] = useState([]);

  console.log("currentAccount: ",currentAccount);

  // デプロイされたコントラクトのアドレスを保持する変数を作成
  const contractAddress = "0x695f92AcE41647ec568e1f33cC0A12F5D2e9F3B7";
  // ABIの内容を参照する変数を作成
  const contractABI = abi.abi;

  //getAllWavesからのemitをフロントエンドで受け取る
  const getAllWaves = async() => {
    const{ ethereum } = window;

    try{
      if(ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        //コントラクトからgetAllWavesを呼び出す
        const waves = await wavePortalContract.getAllWaves();
        //UIに必要な要素を設定
        const wavesCleaned = waves.map(wave => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          };
        });
      //React stateにデータを格納する
        setAllWaves(wavesCleaned);

      }else{
        console.log("Ethereum object doesn't exit!");
      }

    } catch(error) {
      console(error);
    }
  };

  //emitされたイベントに反応する
  useEffect(()=>{
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp*1000),
          message: message,
        },
      ]);
    };

    //NewWaveイベントがコントラクトから発信された時に、情報を受け取る
    if(window.ethereum){
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(contractAddress,contractABI,signer);
      wavePortalContract.on("NewWave", onNewWave);
    }
    //メモリリークを防ぐために、NewWaveのイベントを解除
    return () =>  {
      if (wavePortalContract){
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  },[]);

  /* window.ethereumにアクセスできることを確認します */
  const checkIfWalletIsConnected = async() =>{
  try {
    const {ethereum} = window;
    if(!ethereum){
      console.log("Make sure you have Metamask!");
    } else {
       console.log("We have a Ethereum object", ethereum);
    }
     
    /* ユーザーのウォレットへのアクセスが許可されているかどうかを確認します */
    // accountsにWEBサイトを訪れたユーザーのウォレットアカウントを格納する（複数持っている場合も加味、よって account's' と変数を定義している）
    const accounts = await ethereum.request({method:"eth_accounts"});
    // もしアカウントが一つでも存在したら、以下を実行。
    if(accounts.length !== 0){
      const account = accounts[0];
      console.log("Found on authorized account", account);
      setCurrentAccount(account);
      getAllWaves();
    } else {
      // アカウントが存在しない場合は、エラーを出力。
      console.log("No authorized account found")
    }
  } catch(error) {
    console.log(error);
    }
  }

  // connectWalletメソッドを実装
  const connectWallet = async() =>{
    try{
      const{ ethereum } = window;
      if(!ethereum){
        alert("Get MetaMask!");
        return;
      }
      const accounts = await ethereum.request({method: "eth_requestAccounts"});
      console.log("Connected: ",accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch(error) {
      console.log(error)
    }
  }

  // waveの回数をカウントする関数を実装
  const wave = async() =>{
    try{
      const { ethereum } = window;
      if(ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        
        //ABIをここで参照
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrived total wave count...",count.toNumber());

        //コントラクトにある現在の資金出力
        let contractBalance = await provider.getBalance(
          wavePortalContract.address
        );
        console.log(
          "Contract Balance: ",ethers.utils.formatEther(contractBalance)
        );

        //コントラクトに👋（wave）を書き込む。ここから...
        const waveTxn = await wavePortalContract.wave(messageValue,{gasLimit:300000});
        console.log("Mining...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined --", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        //ここまで
      
        let contractBalance_post = await provider.getBalance(wavePortalContract.address);
        //コントラクトの資金が減っていることを確認
        if (contractBalance_post < contractBalance) {
          //減っていたら下記を出力
          console.log("User won ETH!");
        } else {
          console.log("User didn't win ETH.");
        }
        console.log(
          "Contract balance after wave: ",
          ethers.utils.formatEther(contractBalance_post)
        );
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error){
      console.log(error)
    }
  }

  /*
  * WEBページがロードされたときに下記の関数を実行します。
  */
  useEffect(() =>{
    checkIfWalletIsConnected();
  },[])

  return(
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          <span role="img" aria-label="hand-wave">👋</span> WELCOME!
        </div>
        <div className="bio">
          イーサリアムウォレットを接続して、<span role="img" aria-label="hand-wave">👋</span>を送ってください<span role="img" aria-label="shine">✨</span>
        </div>
        {/* waveボタンにwave関数を連動させる */}
        <button className="waveButton" onClick={wave}>
          Wave at Me
        </button>
        {/* ウォレットコネクトのボタンを実装 */}
        {!currentAccount && (
          <button className="wavebutton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
        {currentAccount && (
          <button className="wavebutton" onClick={connectWallet}>
            Wallet Connected
          </button>
        )}
        {/* メッセージボックスを実装 */}
        {currentAccount && (<textarea name = "messageArea"
          placeholder = "メッセージはこちら"
          type = "text"
          id = "message"
          value = {messageValue}
          onChange={e => setMessageValue(e.target.value)}/>)
        }
        {/* 履歴を表示 */}
        {currentAccount && (
          allWaves.slice(0).reverse().map((wave,index) => {
            return(
              <div key={index} style={{backgroundColor: "#F8F8FF", marginTop: "16px", padding: "8px"}}>
                <div>Address: {wave.address}</div>
                <div>Time: {wave.timestamp.toString()}</div>
                <div>Message: {wave.message}</div>
              </div>)
          })
        )}
      </div>
    </div>
  );
}

export default App

/* export default function App() {

  const wave = () => {

  }

  return (
    <div className="mainContainer">

      <div className="dataContainer">
        <div className="header">
        <span role="img" aria-label="hand-wave">👋</span> WELCOME!
        </div>

        <div className="bio">
        イーサリアムウォレットを接続して、メッセージを作成したら、<span role="img" aria-label="hand-wave">👋</span>を送ってください<span role="img" aria-label="shine">✨</span>
        </div>

        <button className="waveButton" onClick={wave}>
        Wave at Me
        </button>
      </div>
    </div>
  );
}
 */