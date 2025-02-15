import PropTypes from "prop-types";

const CustomerInfo = ({ customer }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {customer.fullName}
          </h1>
          <div className="space-y-1 mt-2">
            <p className="text-gray-400">{customer.email}</p>
            <p className="text-gray-400">{customer.phone}</p>
            <p className="text-gray-400">{customer.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
CustomerInfo.propTypes = {
    customer: PropTypes.shape({
      fullName: PropTypes.string.isRequired,
      email: PropTypes.string,
      phone: PropTypes.string,
      message: PropTypes.string
    }).isRequired
  };
  
export default CustomerInfo;