import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EvolvingNFT from './abis/EvolvingNFT.json';
import EvolutionService from './utils/evolution-service';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [contract, setContract] = useState(null)
  const [nfts, setNfts] = useState([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState(null)
  const [message, setMessage] = useState("")
  const [isWaiting, setIsWaiting] = useState(false)
  
  const evolutionService = new EvolutionService(
    process.env.REACT_APP_HUGGING_FACE_API_KEY,
    process.env.REACT_APP_NFT_STORAGE_API_KEY
  );

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()
    const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
    const contract = new ethers.Contract(contractAddress, EvolvingNFT.abi, provider)
    setContract(contract)
    
    // Load user's NFTs
    await loadUserNFTs(contract, account);
  }
  
  const loadUserNFTs = async (contract, account) => {
    if (!account) return;
    
    setMessage("Loading your NFTs...");
    const totalSupply = await contract.totalSupply();
    
    const nftList = [];
    
    for (let i = 1; i <= totalSupply; i++) {
      try {
        const owner = await contract.ownerOf(i);
        
        if (owner.toLowerCase() === account.toLowerCase()) {
          const tokenURI = await contract.tokenURI(i);
          const stage = await contract.getCurrentStage(i);
          const interactions = await contract.getInteractions(i);
          
          // Fetch metadata
          const response = await fetch(tokenURI);
          const metadata = await response.json();
          
          nftList.push({
            id: i,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            stage: stage.toNumber(),
            interactions: interactions.toNumber(),
            attributes: metadata.attributes || []
          });
        }
      } catch (error) {
        console.error(`Error loading NFT #${i}:`, error);
      }
    }
    
    setNfts(nftList);
    setMessage("");
  }

  const submitHandler = async (e) => {
    e.preventDefault()

    if (name === "" || description === "") {
      window.alert("Please provide a name and description")
      return
    }

    setIsWaiting(true)

    // Create an initial image
    const imageData = await createImage()
    
    // Generate evolution URIs
    const evolutionURIs = await generateEvolutionStages(imageData)
    
    // Mint the NFT with all evolution stages
    await mintNFT(evolutionURIs)

    setIsWaiting(false)
    setMessage("")
    
    // Reload user's NFTs
    await loadUserNFTs(contract, account);
  }

  const createImage = async () => {
    setMessage("Generating Initial Image...")
    
    // Call to Hugging Face for image generation
    // ... (same as your existing code)
    
    return imageData
  }
  
  const generateEvolutionStages = async (imageData) => {
    setMessage("Generating evolution stages...")
    
    // Generate 5 evolution stages
    const evolutionURIs = await evolutionService.generateEvolutions(
      imageData, 
      description,
      5
    );
    
    return evolutionURIs;
  }

  const mintNFT = async (evolutionURIs) => {
    setMessage("Waiting for NFT Mint...")

    const signer = await provider.getSigner()
    const transaction = await contract.connect(signer).mint(
      evolutionURIs[0], // Initial URI
      evolutionURIs, // All evolution URIs
      { value: ethers.utils.parseUnits("1", "ether") }
    )
    
    await transaction.wait()
  }
  
  const connectWalletHandler = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(ethers.utils.getAddress(accounts[0]));
  }

  useEffect(() => {
    loadBlockchainData()
  }, [account])

  return (
    <div>
      <nav>
        <div className='nav__brand'>
          <h1>Evolving AI NFTs on ApeChain</h1>
        </div>

        {account ? (
          <button type="button" className='nav__connect'>
            {account.slice(0, 6) + '...' + account.slice(38, 42)}
          </button>
        ) : (
          <button type="button" className='nav__connect' onClick={connectWalletHandler}>
            Connect
          </button>
        )}
      </nav>

      <div className='form'>
        <form onSubmit={submitHandler}>
          <input type="text" placeholder="Create a name..." onChange={(e) => { setName(e.target.value) }} />
          <input type="text" placeholder="Create a description..." onChange={(e) => setDescription(e.target.value)} />
          <input type="submit" value="Create & Mint Evolving NFT" />
        </form>

        <div className="image">
          {!isWaiting && image ? (
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      
      {/* Display user's NFTs */}
      <div className="nft-gallery">
        <h2>Your Evolving NFTs</h2>
        <div className="nft-grid">
          {nfts.map((nft) => (
            <div key={nft.id} className="nft-card">
              <img src={nft.image} alt={nft.name} />
              <div className="nft-info">
                <h3>{nft.name}</h3>
                <p>{nft.description}</p>
                <div className="nft-stats">
                  <div className="stat">
                    <span>Stage:</span> {nft.stage}
                  </div>
                  <div className="stat">
                    <span>Interactions:</span> {nft.interactions}
                  </div>
                </div>
                <div className="nft-attributes">
                  {nft.attributes.map((attr, index) => (
                    <div key={index} className="attribute">
                      <span>{attr.trait_type}:</span> {attr.value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
