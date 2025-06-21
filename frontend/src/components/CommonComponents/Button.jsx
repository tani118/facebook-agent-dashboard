import React from "react";
import loadingSpinner from "../../assets/spinner.gif";

const Button = ({
  children,
  variant = "PRIMARY",
  type,
  disabled,
  className,
  onClick,
  loading = false,
}) => {
  const getColor = () => {
    if (variant === "PRIMARY") {
      return "bg-primary";
    } else if (variant === "DANGER") {
      return "bg-[#E15240]";
    } else if (variant === "SECONDARY") {
      return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };
  
  const getTextColor = () => {
    if (variant === "SECONDARY") {
      return "text-gray-700";
    }
    return "text-white";
  };
  
  return (
    <button
      disabled={loading || disabled}
      onClick={onClick}
      type={type ? type : "button"}
      className={`${getColor()} py-2 px-7 rounded-md flex items-center justify-center ${getTextColor()} w-fit h-10 ${className}`}
    >
      {loading && (
        <img
          src={loadingSpinner}
          alt="loading"
          className="h-6 w-6 mr-3 my-auto"
        />
      )}
      {children}
    </button>
  );
};

export default Button;
