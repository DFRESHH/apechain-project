// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EvolvingNFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    address public owner;
    uint256 public cost;
    
    // Evolution-specific mappings
    mapping(uint256 => uint256) public evolutionStages; // Tracks current evolution stage
    mapping(uint256 => uint256) public interactions; // Tracks total interactions
    mapping(uint256 => uint256) public lastInteractionTime; // Tracks when last evolved
    mapping(uint256 => string[]) public evolutionURIs; // Stores all possible evolution URIs
    
    // Events
    event NFTEvolved(uint256 indexed tokenId, uint256 newStage, uint256 interactionCount);
    event InteractionRecorded(uint256 indexed tokenId, address interactor, uint256 interactionCount);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _cost
    ) ERC721(_name, _symbol) {
        owner = msg.sender;
        cost = _cost;
    }
    
    function mint(string memory initialTokenURI, string[] memory _evolutionURIs) public payable {
        require(msg.value >= cost, "Insufficient payment");
        require(_evolutionURIs.length > 0, "Must provide at least one evolution URI");
        
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, initialTokenURI);
        
        // Initialize evolution data
        evolutionStages[newItemId] = 0;
        interactions[newItemId] = 0;
        lastInteractionTime[newItemId] = block.timestamp;
        
        // Store evolution URIs
        for (uint i = 0; i < _evolutionURIs.length; i++) {
            evolutionURIs[newItemId].push(_evolutionURIs[i]);
        }
    }
    
    // Records an interaction with the NFT
    function recordInteraction(uint256 tokenId) public {
        require(_exists(tokenId), "NFT does not exist");
        require(block.timestamp - lastInteractionTime[tokenId] >= 1 days, "Can only interact once per day");
        
        interactions[tokenId]++;
        lastInteractionTime[tokenId] = block.timestamp;
        
        emit InteractionRecorded(tokenId, msg.sender, interactions[tokenId]);
        
        // Check if NFT should evolve
        checkAndEvolve(tokenId);
    }
    
    // Internal function to check if NFT should evolve and process evolution
    function checkAndEvolve(uint256 tokenId) internal {
        uint256 currentStage = evolutionStages[tokenId];
        
        // Check if we have more evolutions available
        if (currentStage + 1 < evolutionURIs[tokenId].length) {
            // Evolution thresholds - can be customized
            uint256[] memory thresholds = new uint256[](5);
            thresholds[0] = 20;   // 5 interactions for first evolution
            thresholds[1] = 30;  // 15 for second
            thresholds[2] = 50;  // 30 for third
            thresholds[3] = 100;  // 50 for fourth
            thresholds[4] = 200; // 100 for fifth
            
            // If we've passed the threshold for the next stage
            if (currentStage < thresholds.length && 
                interactions[tokenId] >= thresholds[currentStage]) {
                
                // Evolve to next stage
                evolutionStages[tokenId]++;
                
                // Update token URI to the next evolution stage
                _setTokenURI(tokenId, evolutionURIs[tokenId][evolutionStages[tokenId]]);
                
                // Emit evolution event
                emit NFTEvolved(tokenId, evolutionStages[tokenId], interactions[tokenId]);
            }
        }
    }
    
    // Allow owner to manually trigger evolution (for testing or special cases)
    function triggerEvolution(uint256 tokenId) public {
        require(msg.sender == owner || ownerOf(tokenId) == msg.sender, "Not authorized");
        require(_exists(tokenId), "NFT does not exist");
        require(evolutionStages[tokenId] + 1 < evolutionURIs[tokenId].length, "No more evolution stages");
        
        // Evolve to next stage
        evolutionStages[tokenId]++;
        
        // Update token URI
        _setTokenURI(tokenId, evolutionURIs[tokenId][evolutionStages[tokenId]]);
        
        // Emit evolution event
        emit NFTEvolved(tokenId, evolutionStages[tokenId], interactions[tokenId]);
    }
    
    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }
    
    function withdraw() public {
        require(msg.sender == owner, "Not the owner");
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
    
    // Get current evolution stage
    function getCurrentStage(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "NFT does not exist");
        return evolutionStages[tokenId];
    }
    
    // Get total interactions
    function getInteractions(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "NFT does not exist");
        return interactions[tokenId];
    }
}
