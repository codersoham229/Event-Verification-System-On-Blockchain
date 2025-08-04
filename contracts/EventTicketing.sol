// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventTicketing is ERC721, ReentrancyGuard, Ownable {
    uint256 private _eventIdCounter;
    uint256 private _tokenIdCounter;

    struct Event {
        uint256 id;
        string name;
        string description;
        uint256 eventDate;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 ticketsSold;
        address organizer;
        bool active;
    }

    struct Ticket {
        uint256 eventId;
        address owner;
        string attendeeName;
        bool isUsed;
        uint256 mintedAt;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => mapping(uint256 => bool)) public eventTickets; // eventId => tokenId => exists

    event EventCreated(
        uint256 indexed eventId,
        string name,
        address indexed organizer
    );

    event TicketMinted(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        address indexed owner,
        string attendeeName
    );

    event TicketVerified(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        address indexed verifier
    );

    event TicketUsed(
        uint256 indexed eventId,
        uint256 indexed tokenId
    );

    constructor() ERC721("EventTicket", "EVTKT") Ownable(msg.sender) {}

    /**
     * @dev Create a new event
     */
    function createEvent(
        string memory name,
        string memory description,
        uint256 eventDate,
        uint256 ticketPrice,
        uint256 maxTickets
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Event name cannot be empty");
        require(eventDate > block.timestamp, "Event date must be in the future");
        require(maxTickets > 0, "Max tickets must be greater than 0");

        _eventIdCounter++;
        uint256 eventId = _eventIdCounter;

        events[eventId] = Event({
            id: eventId,
            name: name,
            description: description,
            eventDate: eventDate,
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            ticketsSold: 0,
            organizer: msg.sender,
            active: true
        });

        emit EventCreated(eventId, name, msg.sender);
        return eventId;
    }

    /**
     * @dev Mint a ticket for an event
     */
    function mintTicket(
        uint256 eventId,
        string memory attendeeName
    ) external payable nonReentrant returns (uint256) {
        Event storage event_ = events[eventId];
        require(event_.active, "Event is not active");
        require(event_.ticketsSold < event_.maxTickets, "Event is sold out");
        require(msg.value >= event_.ticketPrice, "Insufficient payment");
        require(bytes(attendeeName).length > 0, "Attendee name cannot be empty");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Mint the NFT
        _safeMint(msg.sender, tokenId);

        // Store ticket information
        tickets[tokenId] = Ticket({
            eventId: eventId,
            owner: msg.sender,
            attendeeName: attendeeName,
            isUsed: false,
            mintedAt: block.timestamp
        });

        // Mark this ticket as belonging to this event
        eventTickets[eventId][tokenId] = true;

        // Update event ticket count
        event_.ticketsSold++;

        // Refund excess payment
        if (msg.value > event_.ticketPrice) {
            payable(msg.sender).transfer(msg.value - event_.ticketPrice);
        }

        // Send payment to event organizer
        payable(event_.organizer).transfer(event_.ticketPrice);

        emit TicketMinted(eventId, tokenId, msg.sender, attendeeName);
        return tokenId;
    }

    /**
     * @dev Verify a ticket for an event
     */
    function verifyTicket(
        uint256 eventId,
        uint256 ticketId
    ) external view returns (
        bool valid,
        address owner,
        string memory attendeeName,
        bool isUsed
    ) {
        // Check if ticket exists and belongs to the event
        if (!eventTickets[eventId][ticketId] || _ownerOf(ticketId) == address(0)) {
            return (false, address(0), "", false);
        }

        Ticket memory ticket = tickets[ticketId];

        // Verify ticket belongs to the specified event
        if (ticket.eventId != eventId) {
            return (false, address(0), "", false);
        }

        return (true, ticket.owner, ticket.attendeeName, ticket.isUsed);
    }

    /**
     * @dev Mark a ticket as used (can only be called by event organizer or contract owner)
     */
    function markTicketUsed(uint256 eventId, uint256 ticketId) external {
        require(_ownerOf(ticketId) != address(0), "Ticket does not exist");
        require(eventTickets[eventId][ticketId], "Ticket does not belong to this event");

        Event memory event_ = events[eventId];
        require(
            msg.sender == event_.organizer || msg.sender == owner(),
            "Only event organizer or contract owner can mark tickets as used"
        );

        Ticket storage ticket = tickets[ticketId];
        require(!ticket.isUsed, "Ticket already used");

        ticket.isUsed = true;

        emit TicketUsed(eventId, ticketId);
    }

    /**
     * @dev Get event details
     */
    function getEvent(uint256 eventId) external view returns (
        string memory name,
        string memory description,
        uint256 eventDate,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 ticketsSold,
        address organizer
    ) {
        Event memory event_ = events[eventId];
        require(event_.active || event_.organizer != address(0), "Event does not exist");

        return (
            event_.name,
            event_.description,
            event_.eventDate,
            event_.ticketPrice,
            event_.maxTickets,
            event_.ticketsSold,
            event_.organizer
        );
    }

    /**
     * @dev Get ticket details
     */
    function getTicket(uint256 tokenId) external view returns (
        uint256 eventId,
        address ticketOwner,
        string memory attendeeName,
        bool isUsed
    ) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");

        Ticket memory ticket = tickets[tokenId];
        return (
            ticket.eventId,
            ticket.owner,
            ticket.attendeeName,
            ticket.isUsed
        );
    }

    /**
     * @dev Get total number of events created
     */
    function eventCount() external view returns (uint256) {
        return _eventIdCounter;
    }

    /**
     * @dev Deactivate an event (only organizer)
     */
    function deactivateEvent(uint256 eventId) external {
        Event storage event_ = events[eventId];
        require(msg.sender == event_.organizer, "Only event organizer can deactivate");
        require(event_.active, "Event is already inactive");

        event_.active = false;
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Override transfer functions to update ticket owner
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);

        // Update ticket owner when transferred
        if (from != address(0) && to != address(0)) {
            tickets[tokenId].owner = to;
        }

        return previousOwner;
    }
}