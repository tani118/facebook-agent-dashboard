import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryParams } from "@/setup/hooks/utils/useQueryParams";
import TextBox from "./utils/TextBox";
import Message from "./utils/Message";
import Profile from "./utils/Profile";
import useAxiosPrivate from "@/setup/hooks/auth/useAxiosPrivate";
import useAuth from "@/setup/hooks/auth/useAuth";
import spinner from "@/assets/connectSpinner.svg";
import { useNavigate } from "react-router-dom";
import useApiSender from "@/setup/hooks/api/useApiSender";
import { sendMessage } from "@/webApi/sendMessage";
import { socket } from "@/setup/socket/socket";
import usePage from "@/setup/hooks/auth/usePage";

export interface ChatProps {
  mid: string;
  conversation_id: string;
  message: string;
  payload: {
    type: string,
    url: string
  },
  createdAt: string;
  mode: "self" | "other";
}
export interface ProfileProps {
  firstname: string;
  lastname: string;
  img: string;
  gender: string;
  timezone: string;
  customer_id: string;
}
const ChatSection = () => {
  const { page } = usePage();
  const navigate = useNavigate();
  const { chat_id } = useQueryParams();
  const axiosPrivate = useAxiosPrivate();
  const scrollDummyRef = useRef<HTMLSpanElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [chats, setChats] = useState<ChatProps[]>([]);
  const [profile, setProfile] = useState<ProfileProps>({
    customer_id: "-",
    firstname: "Anonymous",
    lastname: "",
    img: "https://eu.ui-avatars.com/api/?name=A&size=460",
    gender: "-",
    timezone: "-",
  });
  const { send: sendMessageCall, isLoading: sending } = useApiSender(
    sendMessage,
    true
  );

  //scroll down to latest message
  useLayoutEffect(() => {
    if (chats) {
      if (scrollDummyRef.current) {
        scrollDummyRef.current.scrollIntoView({
          behavior: "instant",
        });
      }
    }
  }, [isLoading, sending, chats]);

  //http get request to fetch messages
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const [chatResponse, profileResponse] = await Promise.all([
          axiosPrivate.get("/chat/messages", {
            params: { conversation_id: chat_id },
          }),
          axiosPrivate.get("/chat/profile", {
            params: { conversation_id: chat_id },
          }),
        ]);
        if (profileResponse.data) {
          const { customer_id, firstname, lastname, gender, img, timezone } =
            profileResponse.data;
          setProfile({
            customer_id,
            firstname,
            lastname,
            img,
            gender,
            timezone,
          });
        }

        if (chatResponse.data) {
          const msg_list = chatResponse.data.map((msg: any) => ({
            mid: msg._id,
            conversation_id: msg.conversation_id,
            message: msg.message,
            payload: msg.payload,
            createdAt: msg.createdAt,
            mode: msg.mode,
          }));
          setChats([...msg_list]);
        }
      } catch (err: any) {
        console.log(err.message);
        navigate("/app");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [chat_id]);

  //websocket listener
  useEffect(() => {
    function newMessage(data: ChatProps) {
      console.log(data);
      const { mid, conversation_id, mode, message, payload, createdAt } = data;
      if (conversation_id === chat_id) {
        setChats((prev) => [
          ...prev,
          { mid, conversation_id, mode, message, payload, createdAt },
        ]);
      }
    }
    socket.on("new_message", newMessage);
    return () => {
      socket.off("new_message", newMessage);
      };
  }, [chat_id]);

  const messageType = (index: number, mode: "self" | "other") => {
    const currentMessage = chats[index];
    const prevMessage = index > 0 ? chats[index - 1] : null;
    const nextMessage = index < chats.length - 1 ? chats[index + 1] : null;
    
    // Helper function to check if two messages are within 2 minutes
    const isWithinTimeLimit = (msg1: ChatProps, msg2: ChatProps): boolean => {
      const time1 = new Date(msg1.createdAt).getTime();
      const time2 = new Date(msg2.createdAt).getTime();
      const diffInMinutes = Math.abs(time1 - time2) / (1000 * 60);
      return diffInMinutes <= 2;
    };
    
    // Check if this is the first message or sender changed or time gap > 2 minutes
    const isFirst = index === 0 || 
                   prevMessage?.mode !== mode || 
                   !isWithinTimeLimit(currentMessage, prevMessage);
    
    // Check if this is the last message or sender will change or time gap > 2 minutes
    const isLast = index === chats.length - 1 || 
                  nextMessage?.mode !== mode || 
                  !isWithinTimeLimit(currentMessage, nextMessage);
    
    if (isFirst && isLast) return "both";
    else if (isFirst) return "first";
    else if (isLast) return "last";
    else return "none";
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const newMessage: ChatProps = {
      mid: window?.crypto.randomUUID(),
      conversation_id: chat_id,
      message: currentMessage,
      payload: {
        type: "text",
        url:""
      },
      createdAt: new Date().toString(),
      mode: "self",
    };
    setChats((prev) => [...prev, newMessage]);
    setCurrentMessage("");
    try {
      await sendMessageCall({
        message: newMessage.message,
        conversation_id: chat_id,
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="h-full w-full flex">
      {isLoading ? (
        <div className="w-full h-full bg-gray-50 flex">
          <img src={spinner} alt={"Loading chat"} className="m-auto size-10" />
        </div>
      ) : (
        <>
          <div className="bg-gray-50 flex-1 h-full flex flex-col">
            <div className="px-8 py-4 border-b bg-white">
              <span className="text-xl font-semibold">
                {profile.firstname + " " + profile.lastname}
              </span>
            </div>

            <div className="flex flex-col flex-grow overflow-y-auto justify-between">
              {/* messages */}
              <div className="flex flex-col pt-4 px-8">
                {chats.map(({ mid, message, payload, createdAt, mode }, index) => (
                  <Message
                    key={mid}
                    text={message}
                    payload={payload}
                    mode={mode}
                    time={createdAt}
                    icon={mode === "self" ? page.picture : profile.img}
                    name={
                      mode == "self"
                        ? page.page_name
                        : profile.firstname + " " + profile.lastname
                    }
                    type={messageType(index, mode)}
                  />
                ))}
              </div>
              <span ref={scrollDummyRef} />
            </div>
            <div className="w-full max-w-[800px] self-center my-4 mx-8">
              <TextBox
                value={currentMessage}
                onChange={(e) => {
                  if (e.target.value.length < 2000)
                    setCurrentMessage(e.target.value);
                }}
                submit={onSubmit}
              />
            </div>
          </div>
          <Profile
            firstname={profile?.firstname}
            lastname={profile?.lastname}
            customer_id={profile?.customer_id}
            img={profile?.img}
            gender={profile?.gender}
            timezone={profile?.timezone}
          />
        </>
      )}
    </div>
  );
};

export default ChatSection;
