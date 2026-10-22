'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand/brand-logo'
import Step1Personal from '@/components/apply-steps/Step1Personal'
import Step2Documents from '@/components/apply-steps/Step2Documents'
import Step5Dependents from '@/components/apply-steps/Step5Dependents'
import Step6MedicalHistory from '@/components/apply-steps/Step6MedicalHistory'
import Step7Banking from '@/components/apply-steps/Step7Banking'
import Step6ReviewTermsSubmit from '@/components/apply-steps/Step6ReviewTermsSubmit'
import { ApplicationData } from '@/types/application'

export default function ApplyPage() {
  const searchParams = useSearchParams()
  const source = searchParams.get('source')
  const brokerCode = searchParams.get('brokerCode')
  const planId = searchParams.get('plan')
  const planName = searchParams.get('planName')
  const planConfig = searchParams.get('config')
  const monthlyPrice = searchParams.get('price')
  const adults = searchParams.get('adults')
  const children = searchParams.get('children')
  
  const [currentStep, setCurrentStep] = useState(1)
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    firstName: '',
    lastName: '',
    idNumber: '',
    dateOfBirth: '',
    email: '',
    mobile: '',
    addressLine1: '',
    city: '',
    postalCode: '',
    planId: planId || undefined,
    planName: planName || undefined,
    planConfig: (planConfig as 'single' | 'couple' | 'family') || undefined,
    monthlyPrice: monthlyPrice ? parseFloat(monthlyPrice) : undefined,
    brokerCode: brokerCode || undefined,
  })

  const updateData = (data: Partial<ApplicationData>) => {
    setApplicationData(prev => ({ ...prev, ...data }))
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))
  const goToStep = (step: number) => setCurrentStep(step)

  const steps = [
    { number: 1, title: 'Personal Info', component: Step1Personal },
    { number: 2, title: 'Documents', component: Step2Documents },
    { number: 3, title: 'Dependents', component: Step5Dependents },
    { number: 4, title: 'Medical History', component: Step6MedicalHistory },
    { number: 5, title: 'Banking Details', component: Step7Banking },
    { number: 6, title: 'Review & Submit', component: Step6ReviewTermsSubmit },
  ]

  const CurrentStepComponent = steps[currentStep - 1].component

  return (
    <div data-kervox-application className="min-h-screen bg-[#f7f5f0] text-[#2b2926]">
      {/* Header */}
      <div data-kervox-application-header className="border-b border-[#573a30] bg-[#2b2926] shadow-[0_16px_42px_rgba(49,37,28,0.16)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-3 flex items-center gap-3">
            <span aria-hidden="true" className="kervox-apply-mark flex h-12 w-12 items-center justify-center rounded-lg border border-white/20 bg-[#fffefa] shadow-[0_8px_22px_rgba(0,0,0,.17)]"><BrandLogo mark="monogram" width={36} height={36} decorative /></span>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">KERVOX Application</h1>
          </div>
          {(source === 'broker' || source === 'call-centre') && (
            <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm text-white border border-white/20 mb-3">
              {source === 'broker' ? 'Broker-assisted application' : 'Call-centre-assisted application'}
            </div>
          )}
          {planName && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-white/90 font-medium">Selected Plan:</span>
                <span className="text-xl font-bold text-[#f2d6b8]">{planName}</span>
                {monthlyPrice && (
                  <>
                    <span className="text-white/60">|</span>
                    <span className="text-sm text-white/90 font-medium">Monthly Premium:</span>
                    <span className="text-2xl font-bold text-[#f2d6b8]">R{monthlyPrice}</span>
                  </>
                )}
                {(adults || children) && (
                  <>
                    <span className="text-white/60">|</span>
                    <span className="text-sm text-white/90 font-medium">Coverage:</span>
                    <span className="text-lg font-semibold text-white">
                      {adults && parseInt(adults) > 0 && `${adults} Adult${parseInt(adults) > 1 ? 's' : ''}`}
                      {adults && children && parseInt(adults) > 0 && parseInt(children) > 0 && ' + '}
                      {children && parseInt(children) > 0 && `${children} Child${parseInt(children) > 1 ? 'ren' : ''}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b border-[#e6e0d7] bg-[#fffefa] shadow-[0_1px_3px_rgba(49,37,28,0.04)]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => goToStep(step.number)}
                    aria-label={`Go to ${step.title}`}
                    aria-current={currentStep === step.number ? 'step' : undefined}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      currentStep === step.number
                        ? 'bg-[#a64c34] text-white shadow-[0_4px_12px_rgba(166,76,52,.22)]'
                        : currentStep > step.number
                        ? 'bg-[#f5e6dd] text-[#873b29]'
                        : 'bg-[#eee9e1] text-[#81796e]'
                    }`}
                  >
                    {step.number}
                  </button>
                  <span className="text-[10px] mt-1 text-center hidden sm:block leading-tight">{step.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${currentStep > step.number ? 'bg-[#a64c34]' : 'bg-[#e6e0d7]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div key={currentStep} data-kervox-application-step className="rounded-xl border border-[#e6e0d7] bg-[#fffefa] p-5 shadow-[0_18px_48px_rgba(49,37,28,0.055)] sm:p-8">
          <CurrentStepComponent
            data={applicationData}
            updateData={updateData}
            nextStep={nextStep}
            prevStep={prevStep}
            goToStep={goToStep}
          />
        </div>
      </div>
    </div>
  )
}
