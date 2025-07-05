import React from 'react'

const MessageModal = ({message, type='info', onClose}) => {

    let bgColor = 'bg-blue-500';
    let textColor = 'text-white';

    switch (type) {
        case 'success':
            bgColor= 'bg-green-500';
            break;
        case 'error':
            bgColor='bg-red-500';
            break;
        default:
            bgColor = 'bg-blue-500';
            break;
    }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className={`p-6 rounded-lg shadow-xl max-w-sm w-full relative ${bgColor} ${textColor}`}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-xl font-bold px-2 py-1 rounded-full hover:bg-opacity-80 transition-opacity"
        >
          &times;
        </button>
        <p className="text-lg text-center font-semibold mt-4">{message}</p>
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-primary-dark font-semibold rounded-md hover:bg-gray-200 transition-colors shadow-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessageModal
