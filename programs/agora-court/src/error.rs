use anchor_lang::error_code;

#[error_code]
pub enum InputError {
    #[msg("Invalid court authority")]
    InvalidCourtAuthority,
    #[msg("Invalid end time")]
    InvalidEndTime,
    #[msg("Dispute does not contain payer")]
    DisputeDoesNotContainPayer,
    #[msg("User does not have a case in this dispute")]
    UserDoesNotHaveCase,
    #[msg("Dispute is not currently votable")]
    DisputeNotVotable,
    #[msg("Dispute is not finalizable")]
    DisputeNotFinalizable,
    #[msg("Dispute not in valid court")]
    DisputeNotInValidCourt,
    #[msg("Dispute not claimable")]
    DisputeNotClaimable,
    #[msg("Cases no longer can be submitted")]
    CasesNoLongerCanBeSubmitted,
    #[msg("Must include at least one user")]
    UsersEmpty,
    #[msg("User already voted in this dispute")]
    UserAlreadyVoted,
    #[msg("User does not have enough reputation to vote")]
    UserDoesNotHaveEnoughReputation,
    #[msg("User has unclaimed disputes")]
    UserHasUnclaimedDisputes,
    #[msg("User has no unclaimed disputes")]
    UserHasNoUnclaimedDisputes,
    #[msg("User is participating in a max of " + USER_MAX_DISPUTES.to_string() + " disputes")]
    UserMaxDisputesReached,
    #[msg("User cannot claim dispute")]
    UserCannotClaimDispute,
    #[msg("User already provided their case.")]
    UserAlreadyProvidedCase,
    #[msg("The interaction period is over. Users may no longer interact as part of this dispute.")]
    InteractionPeriodEnded,
    #[msg("All users have already interacted with this dispute.")]
    InteractionsFulfilled,
    #[msg("Reputation token payment was specified, but reputation ATA was not provided.")]
    ReputationAtaMissing,
    #[msg("Pay token payment was specified, but either the payment ATA was not provided or the court does not accept a pay token mint.")]
    PaymentAtaMissing,
    #[msg("Provided mint account does not match protocol's initialized mint.")]
    ProtocolMintMismatch,
    #[msg("Reputation mint does not match mint specified in court.")]
    ReputationMintMismatch,
    #[msg("Signer is not authorized by the protocol to interact.")]
    UserNotAuthorized,
    #[msg("Protocol does not own this court.")]
    InvalidProtocol,
    #[msg("User does not own this court.")]
    InvalidEditAuthority,
}