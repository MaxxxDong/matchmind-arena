// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SignalArena
/// @notice Event-first registry for AI football match signals committed on Mantle.
contract SignalArena {
    uint16 public constant MAX_BPS = 10_000;

    enum MatchWindow {
        PreMatch,
        FirstHalf,
        SecondHalf,
        PostEvent,
        DemoReplay
    }

    enum MatchResult {
        Unset,
        HomeWin,
        Draw,
        AwayWin
    }

    struct Agent {
        bool registered;
        bytes32 agentIdHash;
        bytes32 metadataHash;
        string metadataUri;
        uint256 registeredAt;
    }

    struct SignalInput {
        bytes32 matchId;
        bytes32 contextHash;
        MatchWindow matchWindow;
        uint16 homeBps;
        uint16 drawBps;
        uint16 awayBps;
        uint16 confidenceBps;
        bytes32 evidenceHash;
        bytes32 metadataHash;
        string metadataUri;
    }

    struct Resolution {
        bool resolved;
        MatchResult result;
        bytes32 sourceHash;
        string sourceUri;
        uint256 resolvedAt;
    }

    address public immutable owner;
    uint256 public nextSignalId = 1;

    mapping(address => Agent) private agents;
    mapping(bytes32 => address) private agentIdOwner;
    mapping(bytes32 => Resolution) private resolutions;
    mapping(bytes32 => bool) private hasPrimarySignal;

    event AgentRegistered(
        address indexed agent,
        bytes32 indexed agentIdHash,
        bytes32 metadataHash,
        string metadataUri,
        uint256 registeredAt
    );

    event SignalSubmitted(
        uint256 indexed signalId,
        address indexed agent,
        bytes32 indexed matchId,
        bytes32 agentIdHash,
        MatchWindow matchWindow,
        uint16 homeBps,
        uint16 drawBps,
        uint16 awayBps,
        uint16 confidenceBps,
        bytes32 contextHash,
        bytes32 evidenceHash,
        bytes32 metadataHash,
        string metadataUri,
        bool isRevision
    );

    event MatchResolved(
        bytes32 indexed matchId,
        MatchResult result,
        bytes32 sourceHash,
        string sourceUri,
        uint256 resolvedAt
    );

    error OnlyOwner();
    error AgentAlreadyRegistered();
    error AgentIdAlreadyRegistered();
    error AgentNotRegistered();
    error InvalidHash();
    error InvalidProbabilityVector();
    error InvalidConfidence();
    error MatchAlreadyResolved();
    error InvalidResult();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerAgent(
        bytes32 agentIdHash,
        bytes32 metadataHash,
        string calldata metadataUri
    ) external {
        if (agents[msg.sender].registered) revert AgentAlreadyRegistered();
        if (agentIdHash == bytes32(0) || metadataHash == bytes32(0)) revert InvalidHash();
        if (agentIdOwner[agentIdHash] != address(0)) revert AgentIdAlreadyRegistered();

        agents[msg.sender] = Agent({
            registered: true,
            agentIdHash: agentIdHash,
            metadataHash: metadataHash,
            metadataUri: metadataUri,
            registeredAt: block.timestamp
        });
        agentIdOwner[agentIdHash] = msg.sender;

        emit AgentRegistered(msg.sender, agentIdHash, metadataHash, metadataUri, block.timestamp);
    }

    function submitSignal(SignalInput calldata input) external returns (uint256 signalId) {
        Agent memory agent = agents[msg.sender];
        if (!agent.registered) revert AgentNotRegistered();
        if (resolutions[input.matchId].resolved) revert MatchAlreadyResolved();
        _validateSignalInput(input);

        signalId = nextSignalId;
        nextSignalId += 1;

        bytes32 primaryKey = keccak256(
            abi.encode(agent.agentIdHash, input.matchId, input.matchWindow)
        );
        bool isRevision = hasPrimarySignal[primaryKey];
        if (!isRevision) {
            hasPrimarySignal[primaryKey] = true;
        }

        emit SignalSubmitted(
            signalId,
            msg.sender,
            input.matchId,
            agent.agentIdHash,
            input.matchWindow,
            input.homeBps,
            input.drawBps,
            input.awayBps,
            input.confidenceBps,
            input.contextHash,
            input.evidenceHash,
            input.metadataHash,
            input.metadataUri,
            isRevision
        );
    }

    function resolveMatch(
        bytes32 matchId,
        MatchResult result,
        bytes32 sourceHash,
        string calldata sourceUri
    ) external onlyOwner {
        if (matchId == bytes32(0) || sourceHash == bytes32(0)) revert InvalidHash();
        if (result == MatchResult.Unset) revert InvalidResult();
        if (resolutions[matchId].resolved) revert MatchAlreadyResolved();

        resolutions[matchId] = Resolution({
            resolved: true,
            result: result,
            sourceHash: sourceHash,
            sourceUri: sourceUri,
            resolvedAt: block.timestamp
        });

        emit MatchResolved(matchId, result, sourceHash, sourceUri, block.timestamp);
    }

    function getAgent(address agentAddress) external view returns (Agent memory) {
        return agents[agentAddress];
    }

    function getAgentOwner(bytes32 agentIdHash) external view returns (address) {
        return agentIdOwner[agentIdHash];
    }

    function getResolution(bytes32 matchId) external view returns (Resolution memory) {
        return resolutions[matchId];
    }

    function primarySignalSubmitted(
        bytes32 agentIdHash,
        bytes32 matchId,
        MatchWindow matchWindow
    ) external view returns (bool) {
        return hasPrimarySignal[keccak256(abi.encode(agentIdHash, matchId, matchWindow))];
    }

    function _validateSignalInput(SignalInput calldata input) private pure {
        if (
            input.matchId == bytes32(0) ||
            input.contextHash == bytes32(0) ||
            input.evidenceHash == bytes32(0) ||
            input.metadataHash == bytes32(0)
        ) {
            revert InvalidHash();
        }

        if (input.confidenceBps > MAX_BPS) revert InvalidConfidence();

        if (
            uint256(input.homeBps) + uint256(input.drawBps) + uint256(input.awayBps) !=
            MAX_BPS
        ) {
            revert InvalidProbabilityVector();
        }
    }
}
