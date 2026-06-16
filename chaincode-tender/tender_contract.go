// v1

// package main

// import (
// 	"encoding/json"
// 	"fmt"
// 	"github.com/hyperledger/fabric-contract-api-go/contractapi"
// )

// type TenderContract struct {
// 	contractapi.Contract
// }

// // Tender structure
// type Tender struct {
// 	TenderID string `json:"tenderId"`
// 	Title    string `json:"title"`
// 	Budget   string `json:"budget"`
// 	Deadline string `json:"deadline"`
// 	Status   string `json:"status"` // "Published", "Evaluated", "Awarded"
// 	DocHash  string `json:"docHash"`
// }

// // PublishTender creates a new tender on the blockchain
// func (c *TenderContract) PublishTender(ctx contractapi.TransactionContextInterface, tenderId string, title string, budget string, deadline string, docHash string) error {
// 	exists, err := c.TenderExists(ctx, tenderId)
// 	if err != nil {
// 		return err
// 	}
// 	if exists {
// 		return fmt.Errorf("tender %s already exists", tenderId)
// 	}

// 	tender := Tender{
// 		TenderID: tenderId,
// 		Title:    title,
// 		Budget:   budget,
// 		Deadline: deadline,
// 		Status:   "Published",
// 		DocHash:  docHash,
// 	}
	
// 	tenderBytes, err := json.Marshal(tender)
// 	if err != nil {
// 		return err
// 	}

// 	return ctx.GetStub().PutState("tender:"+tenderId, tenderBytes)
// }

// // TenderExists checks if a tender is already on the ledger
// func (c *TenderContract) TenderExists(ctx contractapi.TransactionContextInterface, tenderId string) (bool, error) {
// 	tenderBytes, err := ctx.GetStub().GetState("tender:" + tenderId)
// 	if err != nil {
// 		return false, err
// 	}
// 	return tenderBytes != nil, nil
// }

// func main() {
// 	cc, err := contractapi.NewChaincode(&TenderContract{})
// 	if err != nil {
// 		panic(err.Error())
// 	}
// 	if err := cc.Start(); err != nil {
// 		panic(err.Error())
// 	}
// }



// v2

// package main

// import (
// 	"encoding/json"
// 	"fmt"
// 	"github.com/hyperledger/fabric-contract-api-go/contractapi"
// )

// type TenderContract struct {
// 	contractapi.Contract
// }

// // Tender structure
// type Tender struct {
// 	TenderID string `json:"tenderId"`
// 	Title    string `json:"title"`
// 	Budget   string `json:"budget"`
// 	Deadline string `json:"deadline"`
// 	Status   string `json:"status"` // "Published", "Evaluated", "Awarded"
// 	DocHash  string `json:"docHash"`
// }

// // Bid structure (NEW)
// type Bid struct {
// 	BidID     string  `json:"bidId"`
// 	TenderID  string  `json:"tenderId"`
// 	VendorID  string  `json:"vendorId"`
// 	BidAmount float64 `json:"bidAmount"`
// 	DocHash   string  `json:"docHash"`
// 	Timestamp string  `json:"timestamp"`
// }

// // PublishTender creates a new tender on the blockchain
// func (c *TenderContract) PublishTender(ctx contractapi.TransactionContextInterface, tenderId string, title string, budget string, deadline string, docHash string) error {
// 	exists, err := c.TenderExists(ctx, tenderId)
// 	if err != nil { return err }
// 	if exists { return fmt.Errorf("tender %s already exists", tenderId) }

// 	tender := Tender{ TenderID: tenderId, Title: title, Budget: budget, Deadline: deadline, Status: "Published", DocHash: docHash }
// 	tenderBytes, err := json.Marshal(tender)
// 	if err != nil { return err }

// 	return ctx.GetStub().PutState("tender:"+tenderId, tenderBytes)
// }

// // SubmitBid allows a vendor to submit a bid for an existing tender (NEW)
// func (c *TenderContract) SubmitBid(ctx contractapi.TransactionContextInterface, bidId string, tenderId string, vendorId string, bidAmount float64, docHash string, timestamp string) error {
// 	exists, err := c.TenderExists(ctx, tenderId)
// 	if err != nil { return err }
// 	if !exists { return fmt.Errorf("tender %s does not exist", tenderId) }

// 	bid := Bid{ BidID: bidId, TenderID: tenderId, VendorID: vendorId, BidAmount: bidAmount, DocHash: docHash, Timestamp: timestamp }
// 	bidBytes, err := json.Marshal(bid)
// 	if err != nil { return err }

// 	return ctx.GetStub().PutState("bid:"+bidId, bidBytes)
// }

// // GetBidsForTender retrieves all bids submitted for a specific tender using CouchDB Rich Query (NEW)
// func (c *TenderContract) GetBidsForTender(ctx contractapi.TransactionContextInterface, tenderId string) ([]*Bid, error) {
// 	// Query CouchDB for all records where the tenderId matches
// 	queryString := fmt.Sprintf(`{"selector":{"tenderId":"%s"}}`, tenderId)
// 	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
// 	if err != nil { return nil, err }
// 	defer resultsIterator.Close()

// 	var bids []*Bid
// 	for resultsIterator.HasNext() {
// 		queryResponse, err := resultsIterator.Next()
// 		if err != nil { return nil, err }

// 		var bid Bid
// 		err = json.Unmarshal(queryResponse.Value, &bid)
// 		if err != nil { return nil, err }
		
// 		// Ensure we only grab valid Bid objects
// 		if bid.BidID != "" {
// 			bids = append(bids, &bid)
// 		}
// 	}
// 	return bids, nil
// }

// // TenderExists checks if a tender is already on the ledger
// func (c *TenderContract) TenderExists(ctx contractapi.TransactionContextInterface, tenderId string) (bool, error) {
// 	tenderBytes, err := ctx.GetStub().GetState("tender:" + tenderId)
// 	if err != nil { return false, err }
// 	return tenderBytes != nil, nil
// }

// func main() {
// 	cc, err := contractapi.NewChaincode(&TenderContract{})
// 	if err != nil { panic(err.Error()) }
// 	if err := cc.Start(); err != nil { panic(err.Error()) }
// }


// v3

package main

import (
	"encoding/json"
	"fmt"
	"math"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type TenderContract struct {
	contractapi.Contract
}

// Tender structure (UPDATED to include Winner details)
type Tender struct {
	TenderID   string  `json:"tenderId"`
	Title      string  `json:"title"`
	Budget     string  `json:"budget"`
	Deadline   string  `json:"deadline"`
	Status     string  `json:"status"` // "Published", "Awarded"
	DocHash    string  `json:"docHash"`
	WinnerID   string  `json:"winnerId,omitempty"`
	WinningBid float64 `json:"winningBid,omitempty"`
}

// Bid structure
type Bid struct {
	BidID     string  `json:"bidId"`
	TenderID  string  `json:"tenderId"`
	VendorID  string  `json:"vendorId"`
	BidAmount float64 `json:"bidAmount"`
	DocHash   string  `json:"docHash"`
	Timestamp string  `json:"timestamp"`
}

// PublishTender creates a new tender on the blockchain
func (c *TenderContract) PublishTender(ctx contractapi.TransactionContextInterface, tenderId string, title string, budget string, deadline string, docHash string) error {
	exists, err := c.TenderExists(ctx, tenderId)
	if err != nil { return err }
	if exists { return fmt.Errorf("tender %s already exists", tenderId) }

	// tender := Tender{ TenderID: tenderId, Title: title, Budget: budget, Deadline: deadline, Status: "Published", DocHash: docHash }
	tender := Tender{ TenderID: tenderId, Title: title, Budget: budget, Deadline: deadline, Status: "Published", DocHash: docHash, WinnerID: "Pending", WinningBid: 0 }
	tenderBytes, err := json.Marshal(tender)
	if err != nil { return err }

	return ctx.GetStub().PutState("tender:"+tenderId, tenderBytes)
}

// SubmitBid allows a vendor to submit a bid
func (c *TenderContract) SubmitBid(ctx contractapi.TransactionContextInterface, bidId string, tenderId string, vendorId string, bidAmount float64, docHash string, timestamp string) error {
	tenderBytes, err := ctx.GetStub().GetState("tender:" + tenderId)
	if err != nil || tenderBytes == nil { return fmt.Errorf("tender %s does not exist", tenderId) }

	var tender Tender
	json.Unmarshal(tenderBytes, &tender)
	if tender.Status == "Awarded" { return fmt.Errorf("tender %s has already been awarded", tenderId) }

	bid := Bid{ BidID: bidId, TenderID: tenderId, VendorID: vendorId, BidAmount: bidAmount, DocHash: docHash, Timestamp: timestamp }
	bidBytes, err := json.Marshal(bid)
	if err != nil { return err }

	return ctx.GetStub().PutState("bid:"+bidId, bidBytes)
}

// GetBidsForTender retrieves all bids submitted for a specific tender
func (c *TenderContract) GetBidsForTender(ctx contractapi.TransactionContextInterface, tenderId string) ([]*Bid, error) {
	queryString := fmt.Sprintf(`{"selector":{"tenderId":"%s"}}`, tenderId)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil { return nil, err }
	defer resultsIterator.Close()

	var bids []*Bid
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil { return nil, err }

		var bid Bid
		err = json.Unmarshal(queryResponse.Value, &bid)
		if err != nil { return nil, err }
		if bid.BidID != "" { bids = append(bids, &bid) }
	}
	return bids, nil
}

// EvaluateBids automatically finds the lowest bid and awards the tender (NEW)
func (c *TenderContract) EvaluateBids(ctx contractapi.TransactionContextInterface, tenderId string) error {
	tenderBytes, err := ctx.GetStub().GetState("tender:" + tenderId)
	if err != nil || tenderBytes == nil { return fmt.Errorf("tender %s does not exist", tenderId) }

	var tender Tender
	json.Unmarshal(tenderBytes, &tender)
	
	if tender.Status == "Awarded" { return fmt.Errorf("tender %s is already awarded", tenderId) }

	bids, err := c.GetBidsForTender(ctx, tenderId)
	if err != nil { return err }
	if len(bids) == 0 { return fmt.Errorf("no bids found for tender %s", tenderId) }

	// Logic: Find the lowest bid
	var winningBid *Bid
	minAmount := math.MaxFloat64

	for _, bid := range bids {
		if bid.BidAmount < minAmount {
			minAmount = bid.BidAmount
			winningBid = bid
		}
	}

	// Update the Tender State
	tender.Status = "Awarded"
	tender.WinnerID = winningBid.VendorID
	tender.WinningBid = winningBid.BidAmount

	updatedTenderBytes, err := json.Marshal(tender)
	if err != nil { return err }

	return ctx.GetStub().PutState("tender:"+tenderId, updatedTenderBytes)
}

// GetTender returns the full tender details (NEW)
func (c *TenderContract) GetTender(ctx contractapi.TransactionContextInterface, tenderId string) (*Tender, error) {
	tenderBytes, err := ctx.GetStub().GetState("tender:" + tenderId)
	if err != nil { return nil, err }
	if tenderBytes == nil { return nil, fmt.Errorf("tender %s does not exist", tenderId) }

	var tender Tender
	err = json.Unmarshal(tenderBytes, &tender)
	if err != nil { return nil, err }

	return &tender, nil
}

// TenderExists checks if a tender is already on the ledger
func (c *TenderContract) TenderExists(ctx contractapi.TransactionContextInterface, tenderId string) (bool, error) {
	tenderBytes, err := ctx.GetStub().GetState("tender:" + tenderId)
	if err != nil { return false, err }
	return tenderBytes != nil, nil
}

// GetAllTenders retrieves all published and awarded tenders from the ledger
func (c *TenderContract) GetAllTenders(ctx contractapi.TransactionContextInterface) ([]*Tender, error) {
	// Query the ledger for all keys between "tender:" and "tender;"
	// In ASCII, ';' comes immediately after ':', so this grabs all tender prefixes.
	resultsIterator, err := ctx.GetStub().GetStateByRange("tender:", "tender;")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var tenders []*Tender
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var tender Tender
		err = json.Unmarshal(queryResponse.Value, &tender)
		if err != nil {
			return nil, err
		}
		
		tenders = append(tenders, &tender)
	}

	return tenders, nil
}

func main() {
	cc, err := contractapi.NewChaincode(&TenderContract{})
	if err != nil { panic(err.Error()) }
	if err := cc.Start(); err != nil { panic(err.Error()) }
}