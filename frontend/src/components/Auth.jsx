import React, { useEffect, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import { CONTRACT_ABIS, CONTRACT_ADDRESSES,FEES_DECIMALS } from '../utils/constants'

const Auth = ({address, userName, isRegistered, refreshUserData, showCustomModal, registrationFee}) => {

    const [newUserName, setNewUserName] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    const {writeContract: registerUser, data:registerhash, error: registerError} = useWriteContract();

    const {isLoading: isRegistering, isSuccess: isRegisterSuccess, isError: isRegisterTxError, error: registerTxError} = useWaitForTransactionReceipt({
        hash: registerHash,
    });

    useEffect(() => {
        if(isRegisterSuccess) {
            showCustomModal('Registration Successfull !! Welcome to De-Masked', 'success');
            refreshUserData();
            setIsLoading(false);
        }
        if(isRegisterTxError && registerError) {
            showCustomModal(`Registration Failed: ${registerTxError.shortMessage || registerError.message}`, 'error');
            setIsLoading(false);
        }
    }, [isRegisterSuccess, isRegisterTxError, registerTxError, showCustomModal, refreshUserData]);


    useEffect(() => {
        if(registerError) {
            showCustomModal(`Transaction Error : ${registerError.shortMessage || registerErro.message}`, 'error');
            setIsLoading(false);
        }
    }, [registerError, showCustomModal]);


    const handleRegister = async() => {
        setIsLoading(true);
        try{
            registerUser({
                address: CONTRACT_ADDRESSES.DeMaskedCore,
                abi: CONTRACT_ABIS.DeMaskedCore,
                functionName: 'register',
                args: [newUserName],
            })
        } catch(err) {
            console.error("Registering User Error :: ", err);
            showCustomModal(`Failed to initiate registration: ${err.shortMessage} || ${err.message}`, 'error');
            setIsLoading(false);
        }
    }

  return (
<div className="bg-secondary-dark p-8 rounded-xl shadow-lg text-center max-w-lg mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-accent-blue">Register Your DeMasked Profile</h2>
      <p className="text-lg mb-4">
        Welcome! To get started, choose an anonymous username.
      </p>
      <p className="text-lg mb-6">
        Registration is FREE! You will receive <span className="font-bold text-yellow-400">500 DMT</span> to start using the platform.
      </p>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Choose your unique username"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          className="w-full p-3 rounded-md bg-primary-dark border border-gray-600 text-text-light placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent"
        />
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleRegister}
          disabled={isLoading || isRegistering || !newUserName.trim()}
          className="w-full px-6 py-3 bg-accent-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading || isRegistering ? (
            <span className="animate-spin mr-2">⚙️</span>
          ) : (
            `Register Username (Free + 500 DMT)`
          )}
        </button>
      </div>

      {(isLoading || isRegistering) && (
        <p className="mt-4 text-center text-sm text-gray-400">
          Waiting for transaction confirmation... Please do not close this window.
        </p>
      )}
    </div>
  )
}


export default Auth
