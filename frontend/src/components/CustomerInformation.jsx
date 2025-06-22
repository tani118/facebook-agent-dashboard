import React from 'react';
import UserImageDefault from '../assets/user.png';
import { PhoneCall, User } from 'lucide-react';

const CustomerInformation = ({ customer }) => {
  // Extract customer details with fallbacks
  const firstName = customer?.firstName || customer?.first_name || customer?.name?.split(' ')[0] || "Anonymous";
  const lastName = customer?.lastName || customer?.last_name || customer?.name?.split(' ')[1] || "";
  const fullName = customer?.name || `${firstName} ${lastName}`.trim();
  const customerId = customer?.id || "-";
  // Use a default profile picture if none is provided or if the URL doesn't seem valid
  const hasValidProfilePic = customer?.profilePic && 
    (customer.profilePic.startsWith('http') || customer.profilePic.startsWith('/'));
  const profilePic = hasValidProfilePic ? customer.profilePic : UserImageDefault;
  
  return (
    <aside className="bg-white w-[340px] h-full border-l overflow-hidden">
      <div className="w-full h-full">
        <div className="flex flex-col items-center py-6 px-4">
          <div className="mb-2 flex flex-col items-center">
            <img
              src={profilePic}
              alt="profile-icon"
              className="rounded-full w-20 h-20 object-cover"
            />
            <span className="text-xl font-medium mt-2">{fullName}</span>
            <span className="text-gray-400 text-xs">• Offline</span>
          </div>

          <div className="flex gap-2 mt-3 w-full">
            <a 
              href={customerId !== "-" ? `https://www.messenger.com/t/${customerId}` : "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 cursor-pointer w-1/2"
            >
              <PhoneCall className="h-4 w-4" />
              <span className="font-medium">Call</span>
            </a>
            <a 
              href={customerId !== "-" ? `https://www.facebook.com/${customerId}` : "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 cursor-pointer w-1/2"
            >
              <User className="h-4 w-4" />
              <span className="font-medium">Profile</span>
            </a>
          </div>
        </div>

        <div className="w-full p-4 pt-3">
          <div className="w-full bg-white rounded-lg border p-4">
            <span className="font-medium text-gray-800">Customer details</span>
            <div className="grid grid-cols-2 gap-y-2 mt-3">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="text-gray-800 text-sm font-medium">{customer?.email || "example@gmail.com"}</span>
              <span className="text-gray-500 text-sm">First Name</span>
              <span className="text-gray-800 text-sm font-medium">{firstName}</span>
              <span className="text-gray-500 text-sm">Last Name</span>
              <span className="text-gray-800 text-sm font-medium">{lastName}</span>
              
              <div className="col-span-2 mt-2 pt-2 border-t">
                <a
                  href={customerId !== "-" ? `https://www.facebook.com/${customerId}` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View more details
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CustomerInformation;
