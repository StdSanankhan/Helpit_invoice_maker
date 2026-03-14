import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Shield, Check, Upload, Loader2, CreditCard, ChevronRight, ChevronLeft, Zap, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  {
    id: 'easypaisa',
    label: 'Easypaisa',
    icon: '🟢',
    configKey: 'easypaisa_config',
    qrImage: '/easypaisa-qr.jpg',
    color: 'green',
  },
  {
    id: 'jazzcash',
    label: 'JazzCash',
    icon: '🔴',
    configKey: 'jazzcash_config',
    qrImage: '/jazzcash-qr.jpg',
    color: 'red',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    icon: '🏦',
    configKey: 'bank_config',
    qrImage: null,
    color: 'blue',
  },
];

const FEATURES = [
  "Unlimited Invoices & Clients",
  "Direct Email Sending from App",
  "Custom Business Branding & Logo",
  "Multiple Invoice Template Styles",
  "Advanced Analytics Dashboard",
  "Priority Technical Support",
];

const Upgrade = () => {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: choose method, 2: payment details, 3: upload proof
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [proof, setProof] = useState(null);
  const [qrError, setQrError] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/api/settings/`)
      .then(res => res.json())
      .then(data => { setSettings(data); setIsLoading(false); })
      .catch(() => { toast.error("Failed to load payment settings."); setIsLoading(false); });
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proof) { toast.error("Please upload your payment proof."); return; }
    
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting upgrade request...");
    const form = new FormData();
    form.append('payment_method', selectedMethod.id);
    form.append('amount', 9.99);
    form.append('proof', proof);

    try {
      const res = await fetch(`${API_URL}/api/subscriptions/upgrade`, { method: 'POST', body: form });
      
      let data = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
      }

      if (res.ok) {
        toast.success(data.message || "Request submitted! Pending admin approval.", { id: toastId, duration: 6000 });
        setProof(null);
        setStep(4); // success step
        const fi = document.getElementById('proof_upload');
        if (fi) fi.value = '';
      } else {
        const errMsg = data.detail || `Server Error (${res.status})`;
        toast.error(`${res.status}: ${errMsg}`, { id: toastId });
        console.error("Upgrade error:", data || res.status);
      }
    } catch (err) {
      toast.error(`Network error: ${err.message}`, { id: toastId });
      console.error("Fetch error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodConfig = (method) => {
    if (!settings || !method) return {};
    return settings[method.configKey] || {};
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-neon" />
    </div>
  );

  const colorMap = {
    green: { border: 'border-green-500/40', bg: 'bg-green-500/10', text: 'text-green-400', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.15)]' },
    red: { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
    blue: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold heading-gradient">Upgrade to Premium</h1>
        <p className="text-gray-400 text-lg">Unlock the full power of Helpit for just $9.99/month.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Plan card */}
        <div className="glass p-8 rounded-3xl border border-neon/30 shadow-[0_0_30px_rgba(0,242,254,0.08)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-neon text-black text-xs font-bold px-4 py-2 rounded-bl-2xl">RECOMMENDED</div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="text-neon w-6 h-6" /> Premium Plan
            </h2>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-5xl font-black text-white">$9.99</span>
              <span className="text-gray-400 font-medium">/ month</span>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </div>
                <span className="text-gray-300">{f}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-400 border border-white/5">
            <p>✅ Activation within 24 hours of payment verification</p>
            <p className="mt-1">✅ 30-day subscription per payment</p>
          </div>
        </div>

        {/* Payment flow card */}
        <div className="glass p-8 rounded-3xl space-y-6">
          {/* Step indicator */}
          {step < 4 && (
            <div className="flex items-center gap-2 mb-2">
              {[1,2,3].map(s => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s <= step ? 'bg-primary text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]' : 'bg-white/10 text-gray-500'}`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`flex-1 h-0.5 transition-all ${s < step ? 'bg-primary' : 'bg-white/10'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* STEP 1: Choose Method */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Select Payment Method
              </h3>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(method => {
                  const c = colorMap[method.color];
                  return (
                    <button
                      key={method.id}
                      onClick={() => { setSelectedMethod(method); setStep(2); }}
                      className={`w-full text-left p-4 rounded-xl border ${c.border} ${c.bg} hover:opacity-90 transition-all flex items-center justify-between group`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <span className={`font-bold text-lg ${c.text}`}>{method.label}</span>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${c.text} group-hover:translate-x-1 transition-transform`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Payment Details */}
          {step === 2 && selectedMethod && (() => {
            const config = getMethodConfig(selectedMethod);
            const c = colorMap[selectedMethod.color];
            const qrImg = selectedMethod.qrImage;
            return (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white transition-colors p-1">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-xl font-bold text-white">Pay via {selectedMethod.label}</h3>
                </div>

                <div className={`${c.bg} border ${c.border} ${c.glow} p-5 rounded-xl text-center relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${selectedMethod.color}-400 to-${selectedMethod.color}-600`} />
                  <div className="space-y-1 mb-4 text-left bg-black/30 rounded-lg p-4 border border-white/5 inline-block w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Account Title</span>
                      <span className="text-white font-bold">{config.account_title || 'Sanaullah Khan'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Mobile / Account</span>
                      <span className={`${c.text} font-bold text-lg tracking-wider`}>{config.account_number || '03475757431'}</span>
                    </div>
                    {config.extra_info && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Additional Info</span>
                        <span className="text-white text-sm">{config.extra_info}</span>
                      </div>
                    )}
                  </div>

                  {/* QR Code */}
                  {qrImg && (
                    <div className="mt-3">
                      {!qrError[selectedMethod.id] ? (
                        <div className="bg-white p-2 rounded-xl inline-block">
                          <img
                            src={qrImg}
                            alt={`${selectedMethod.label} QR Code`}
                            className="w-44 h-44 object-contain rounded-lg"
                            onError={() => setQrError(prev => ({ ...prev, [selectedMethod.id]: true }))}
                          />
                        </div>
                      ) : (
                        <div className="w-44 h-44 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center mx-auto">
                          <Smartphone className="w-8 h-8 text-gray-500 mb-2" />
                          <p className="text-xs text-gray-500 text-center px-3">
                            Save QR as <span className="text-neon">public/{selectedMethod.qrImage?.replace('/', '')}</span>
                          </p>
                        </div>
                      )}
                      <p className={`text-sm ${c.text} font-medium mt-2`}>Scan using {selectedMethod.label} app</p>
                    </div>
                  )}

                  {selectedMethod.id === 'bank_transfer' && (
                    <p className="text-sm text-gray-400 mt-2 italic">Please use your registered email as the transfer reference.</p>
                  )}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-400">
                  ⚠️ After completing the payment, take a screenshot and proceed to upload it.
                </div>

                <button
                  onClick={() => setStep(3)}
                  className={`w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-primary to-neon text-black flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                >
                  I've paid — Upload Proof <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })()}

          {/* STEP 3: Upload Proof */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(2)} className="text-gray-400 hover:text-white transition-colors p-1">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold text-white">Upload Payment Screenshot</h3>
              </div>
              <p className="text-sm text-gray-400">Upload a clear screenshot of your successful {selectedMethod?.label} payment.</p>

              <label className="flex flex-col items-center justify-center w-full min-h-36 border-2 border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
                <div className="flex flex-col items-center justify-center p-6">
                  <Upload className="w-10 h-10 text-gray-500 mb-3 group-hover:text-primary transition-colors" />
                  {proof ? (
                    <span className="text-neon font-medium text-center break-all">{proof.name}</span>
                  ) : (
                    <>
                      <p className="text-gray-400 font-medium">Click to upload or drag & drop</p>
                      <p className="text-xs text-gray-600 mt-1">PNG, JPG, JPEG, PDF (max 10MB)</p>
                    </>
                  )}
                </div>
                <input id="proof_upload" type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !proof}
                className="w-full bg-gradient-to-r from-primary to-neon text-black font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-40"
              >
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Zap className="w-5 h-5 fill-current" /> Submit Upgrade Request</>}
              </button>
              <p className="text-center text-xs text-gray-500">
                Payment will be verified and your account activated within 24 hours.
              </p>
            </form>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-5 py-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Request Submitted!</h3>
              <p className="text-gray-400">Your payment proof has been received. Our team will verify it and activate your Premium account within <span className="text-white font-bold">24 hours</span>.</p>
              <button onClick={() => setStep(1)} className="text-sm text-primary hover:text-neon transition-colors">Submit another request</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upgrade;



