import React, { useState, useEffect } from 'react';
import { Lock, Zap, X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * PremiumGate - Wraps a button/feature and shows an upgrade modal for free users.
 * 
 * Usage:
 *   <PremiumGate plan={userPlan} featureName="Direct Email Sending">
 *     <button onClick={sendEmail}>Send Email</button>
 *   </PremiumGate>
 */
const PremiumGate = ({ plan, featureName = "this feature", children }) => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const isPremium = plan === 'premium';

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Wrap children in a disabled container */}
      <div
        className="relative group cursor-not-allowed"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowModal(true);
        }}
      >
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        {/* Lock badge */}
        <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg shadow-yellow-500/30">
          <Lock className="w-3 h-3 text-black" />
        </div>
      </div>

      {/* Upgrade Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative glass border border-yellow-500/30 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_40px_rgba(234,179,8,0.15)] animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
                <ShieldCheck className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Premium Feature</h2>
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium capitalize">{featureName}</span> is only available on the <span className="text-yellow-400 font-bold">Premium Plan</span>.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {["Unlimited Invoices & Clients", "Email Sending from App", "Advanced Analytics", "Priority Support"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  </div>
                  {f}
                </div>
              ))}
            </div>

            <button
              onClick={() => { setShowModal(false); navigate('/upgrade'); }}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(234,179,8,0.3)]"
            >
              <Zap className="w-5 h-5 fill-current" />
              Upgrade Now — $9.99/month
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PremiumGate;
