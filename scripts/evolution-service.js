const { NFTStorage } = require('nft.storage');
const axios = require('axios');

class EvolutionService {
  constructor(apiKey, nftStorageKey) {
    this.apiKey = apiKey;
    this.nftStorage = new NFTStorage({ token: nftStorageKey });
  }
  
  async generateEvolutions(baseImage, description, stages = 5) {
    // Array to store IPFS URIs for each evolution
    const evolutionURIs = [];
    
    // Generate the initial image and metadata
    const initialMetadata = await this.createInitialMetadata(baseImage, description);
    evolutionURIs.push(initialMetadata);
    
    // For each additional stage, generate an evolved version
    for (let stage = 1; stage <= stages; stage++) {
      const evolvedMetadata = await this.generateEvolutionStage(
        baseImage, 
        description, 
        stage,
        initialMetadata
      );
      evolutionURIs.push(evolvedMetadata);
    }
    
    return evolutionURIs;
  }
  
  async createInitialMetadata(imageData, description) {
    // Upload the initial image to IPFS
    const { ipnft } = await this.nftStorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: "Evolving NFT - Stage 0",
      description: description,
      attributes: [
        { trait_type: "Evolution Stage", value: "0" },
        { trait_type: "Interactions", value: "0" }
      ]
    });
    
    return `https://ipfs.io/ipfs/${ipnft}/metadata.json`;
  }
  
  async generateEvolutionStage(baseImage, baseDescription, stage, previousMetadata) {
    // Generate evolving prompt based on the stage
    const evolutionPrompts = [
      "slightly enhanced, beginning to change",
      "moderately evolved, gaining new features",
      "significantly transformed, with new colors and details",
      "dramatically evolved, with complex structures and details",
      "fully evolved, legendary form with cosmic energies"
    ];
    
    const evolutionPrompt = stage <= evolutionPrompts.length 
      ? evolutionPrompts[stage - 1]
      : "ultimate legendary form with cosmic powers";
      
    const fullPrompt = `${baseDescription}, ${evolutionPrompt}, detailed, high quality, on ApeChain blockchain`;
    
    // Generate evolved image
    const evolvedImage = await this.generateEvolvedImage(baseImage, fullPrompt, stage);
    
    // Create attributes that reflect the evolution
    const attributes = [
      { trait_type: "Evolution Stage", value: stage.toString() },
      { trait_type: "Evolution Path", value: this.getEvolutionPath(stage) },
      { trait_type: "Power Level", value: (stage * 20).toString() }
    ];
    
    // Add some stage-specific traits
    if (stage >= 2) {
      attributes.push({ trait_type: "Aura", value: this.getAuraType(stage) });
    }
    
    if (stage >= 3) {
      attributes.push({ trait_type: "Special Ability", value: this.getSpecialAbility(stage) });
    }
    
    // Upload to IPFS
    const { ipnft } = await this.nftStorage.store({
      image: new File([evolvedImage], `evolution_stage_${stage}.jpeg`, { type: "image/jpeg" }),
      name: `Evolving NFT - Stage ${stage}`,
      description: `${baseDescription} - Now evolved to stage ${stage} through ApeChain interactions!`,
      attributes: attributes,
      previous_stage: previousMetadata
    });
    
    return `https://ipfs.io/ipfs/${ipnft}/metadata.json`;
  }
  
  async generateEvolvedImage(baseImage, prompt, stage) {
    // We'll use img2img capability of Stable Diffusion to evolve the image
    const response = await axios({
      url: `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        inputs: {
          image: Buffer.from(baseImage).toString('base64'),
          prompt: prompt,
          negative_prompt: "blurry, low quality, distorted",
          denoising_strength: 0.3 + (stage * 0.1) // Gradually increase the transformation
        }
      }),
      responseType: 'arraybuffer',
    });
    
    return response.data;
  }
  
  // Helper methods for creating attributes
  getEvolutionPath(stage) {
    const paths = ["Nascent", "Emergent", "Ascendant", "Transcendent", "Legendary"];
    return paths[Math.min(stage - 1, paths.length - 1)];
  }
  
  getAuraType(stage) {
    const auras = ["Faint Blue", "Glowing Green", "Radiant Gold", "Cosmic Purple", "Divine White"];
    return auras[Math.min(stage - 1, auras.length - 1)];
  }
  
  getSpecialAbility(stage) {
    const abilities = [
      "Chain Vision", 
      "Transaction Boost", 
      "Block Perception", 
      "Gas Optimization", 
      "Consensus Alignment"
    ];
    return abilities[Math.min(stage - 1, abilities.length - 1)];
  }
}

module.exports = EvolutionService;
