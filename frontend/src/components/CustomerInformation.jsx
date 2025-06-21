import React from 'react';
import UserImageDefault from '../assets/user.png';
import Button from './CommonComponents/Button';
import Card from './CommonComponents/Card';
import { PhoneCall, User } from 'lucide-react';

const CustomerInformation = ({ customer }) => {
  return (
    <div className="flex flex-col w-full h-full border-l">
      <div className="flex flex-col gap-2 w-full items-center p-10 border-b">
        <img
          src={UserImageDefault}
          alt="User"
          className="w-20 h-20 rounded-full items-center"
        />
        <h1 className="text-xl font-medium mt-3">{customer?.name || "Unknown Customer"}</h1>
        <div className="flex items-center gap-2 opacity-60">
          <div className="h-2 w-2 bg-black rounded-full"></div>
          <span>Offline</span>
        </div>
        <div className="flex mt-2 gap-4">
          <Button variant="SECONDARY" className="font-medium border shadow-sm h-9 py-1">
            <div className="flex items-center gap-1">
              <PhoneCall className="h-4 w-4" />
              <span>Call</span>
            </div>
          </Button>
          <Button variant="SECONDARY" className="font-medium border shadow-sm h-9 py-1">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="flex justify-center bg-[#EFF2F7] h-full py-10 px-3">
        <Card className="px-3 py-3 w-full">
          <div className="flex flex-col items-start w-[95%] overflow-hidden">
            <h1 className="text-lg font-medium mb-3">Customer details</h1>
            <div className="flex flex-col w-full">
              <div className="flex justify-between gap-2">
                <span className="opacity-60">Email</span>
                <span className="font-medium">{customer?.email || "Not available"}</span>
              </div>
              <div className="flex w-full justify-between gap-2">
                <span className="opacity-60">First Name</span>
                <span className="font-medium">{customer?.firstName || customer?.first_name || "Not available"}</span>
              </div>
              <div className="flex w-full justify-between gap-2">
                <span className="opacity-60">Last Name</span>
                <span className="font-medium">{customer?.lastName || customer?.last_name || "Not available"}</span>
              </div>
            </div>
            {customer?.id && (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://facebook.com/${customer.id}`}
                className="mt-4 text-primary text-lg font-medium"
              >
                View more details
              </a>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerInformation;
