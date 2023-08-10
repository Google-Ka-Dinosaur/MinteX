import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';
// import { network } from 'hardhat';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [image, setImage] = useState(null)
  const [url, setUrl] = useState(null)
  const [nft, setNft] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [description, setDescription] = useState("")
  const submitHandler=async(e)=>{
   e.preventDefault();
   if(name==""||description==""){
    toast.error('Please fill the name and description properly!!!');
    return;
   }
   setImage(null);
   setUrl(null);
   setWaiting(true);
   try{
   const imageData=await createImage();
   const URL=await uploadImage(imageData);
      await mintImage(URL);
   }catch(error){
    console.log(error);
    toast.error('Oops!!! Something went wrong');
   }
      setWaiting(false);
  }
  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)
    const network=await provider.getNetwork();
    const NFTcontract=new ethers.Contract(config[network.chainId].nft.address,NFT,provider);
    setNft(NFTcontract);
    setMessage("");
  }
  const createImage=async()=>{
    setMessage("Generating Image....");
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`
    const response=await axios({
      url:URL,
      method:'POST',
      headers:{
       Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
       Accept:'application/json',
       'Content-Type':'application/json'
      },
      data: JSON.stringify({
           inputs:description,
           options:{
            wait_for_model:true,
           }
        })
      ,
      responseType:'arraybuffer'
    })

    const type=response.headers['content-type'];
    const data=response.data;
    const base64data=Buffer.from(data).toString('base64');
    const img=`data:${type};base64,`+base64data;
    setImage(img);
    return data;
  }
  
  const uploadImage=async(imageData)=>{
    setMessage("uploading image...");
    //creating an instance of NFT storage
    const nftstorage=new NFTStorage({token:process.env.REACT_APP_NFT_STORAGE_API_KEY});
    const {ipnft}=await nftstorage.store({
      image:new File([imageData],"image.jpeg",{type:"image/jpeg"}),
      name:name,
      description:description
    })
    const URL=`https://ipfs.io/ipfs/${ipnft}/metadata.json`;
    setUrl(URL);
    return URL;
  }

  const mintImage=async(tokenURI)=>{
   setMessage("Waiting for mint....");
   const signer=await provider.getSigner();
   const transaction=await nft.connect(signer).mint(tokenURI,{value:ethers.utils.parseUnits("10000000","gwei")});
   await transaction.wait();
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <ToastContainer />
       <div className='form'>
        <form onSubmit={submitHandler}>
           <input className='field' type="text" placeholder='create a name...' onChange={(e)=>{setName(e.target.value)}}></input> 
           <input className='field' type="text" placeholder='create a description...' onChange={(e)=>{setDescription(e.target.value)}}></input> 
           {!waiting&&<input type="submit" value="Create & Mint"></input>}
        </form>
        <div className={`image ${(image&&!waiting)&&`imagebd`}`}>

          {
            (!waiting&&image)?( <img src={image} alt="AI generated Image"></img>):waiting?( <div className='image__placeholder'>
            <Spinner animation='border'/>
            <p>{message}</p>
          </div>):(<></>)
          }
        </div>
       </div>
      {!waiting&&url?(<p className='message'>view&nbsp;<a href={url} target='_blank' rel='noreferrer'>Metadata</a></p>):(<></>)}
    </div>
  );
}

export default App;
