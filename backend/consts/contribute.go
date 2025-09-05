package consts

type ContributeStatus string

const (
	ContributeStatusPending  ContributeStatus = "pending"
	ContributeStatusApproved ContributeStatus = "approved"
	ContributeStatusRejected ContributeStatus = "rejected"
)

type ContributeType string

const (
	ContributeTypeAdd  ContributeType = "add"
	ContributeTypeEdit ContributeType = "edit"
)
