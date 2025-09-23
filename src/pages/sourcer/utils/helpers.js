export const statusPill = (status) => {
  switch (status) {
    case "Pending":
      return "gold";
    case "Assigned":
      return "geekblue";
    case "Offer":
      return "cyan";
    case "Purchased":
      return "green";
    case "Disapproved":
      return "red";
    case "Sold":
      return "green";
    case "Hold":
      return "orange";
    case "Seller Rejected":
      return "magenta";
    case "Dropshipped":
      return "blue";
    case "Returned":
      return "volcano";
    case "Completed":
      return "green";
    default:
      return "default";
  }
};