'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface IRInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  companyName: string;
  contactPerson: string;
  position: string;
  companyDescription: string;
  irDeck: File | null;
}

export default function IRInquiryModal({ isOpen, onClose }: IRInquiryModalProps) {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    position: '',
    companyDescription: '',
    irDeck: null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = '회사 이름을 입력해주세요.';
    }
    
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = '담당자를 입력해주세요.';
    }
    
    if (!formData.position.trim()) {
      newErrors.position = '담당자 직위를 입력해주세요.';
    }
    
    if (!formData.companyDescription.trim()) {
      newErrors.companyDescription = '간단한 회사 소개를 입력해주세요.';
    }
    
    if (!formData.irDeck) {
      newErrors.irDeck = 'IR 덱을 첨부해주세요.' as any;
    } else if (formData.irDeck.type !== 'application/pdf') {
      newErrors.irDeck = 'PDF 파일만 업로드 가능합니다.' as any;
    } else if (formData.irDeck.size > 10 * 1024 * 1024) { // 10MB
      newErrors.irDeck = '파일 크기는 10MB 이하여야 합니다.' as any;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, irDeck: file }));
    if (errors.irDeck) {
      setErrors(prev => ({ ...prev, irDeck: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('companyName', formData.companyName);
      formDataToSend.append('contactPerson', formData.contactPerson);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('companyDescription', formData.companyDescription);
      if (formData.irDeck) {
        formDataToSend.append('irDeck', formData.irDeck);
      }
      
      const response = await fetch('/api/inquiries/startup', {
        method: 'POST',
        body: formDataToSend
      });
      
      if (!response.ok) {
        throw new Error('문의 제출에 실패했습니다.');
      }
      
      // 성공 시 폼 리셋 및 모달 닫기
      setFormData({
        companyName: '',
        contactPerson: '',
        position: '',
        companyDescription: '',
        irDeck: null
      });
      onClose();
      
      // 성공 메시지 (간단한 alert, 나중에 toast로 개선 가능)
      alert('IR 문의가 성공적으로 제출되었습니다. 5영업일 내에 회신드리겠습니다.');
      
    } catch (error) {
      console.error('IR 문의 제출 오류:', error);
      alert('문의 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        companyName: '',
        contactPerson: '',
        position: '',
        companyDescription: '',
        irDeck: null
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">스타트업 IR 문의</DialogTitle>
          <DialogDescription>
            아래 양식을 입력해서 제출해주시면, 5영업일 내에 회신을 드리겠습니다.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">회사 이름 *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="회사 이름을 입력해주세요"
              disabled={isSubmitting}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500">{errors.companyName}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactPerson">담당자 *</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              placeholder="담당자 이름을 입력해주세요"
              disabled={isSubmitting}
            />
            {errors.contactPerson && (
              <p className="text-sm text-red-500">{errors.contactPerson}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="position">담당자 직위 *</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              placeholder="담당자 직위를 입력해주세요"
              disabled={isSubmitting}
            />
            {errors.position && (
              <p className="text-sm text-red-500">{errors.position}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyDescription">간단한 회사 소개 *</Label>
            <Textarea
              id="companyDescription"
              value={formData.companyDescription}
              onChange={(e) => handleInputChange('companyDescription', e.target.value)}
              placeholder="회사와 사업에 대해 간단히 소개해주세요"
              rows={3}
              disabled={isSubmitting}
            />
            {errors.companyDescription && (
              <p className="text-sm text-red-500">{errors.companyDescription}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="irDeck">IR 덱 첨부 *</Label>
            <div className="relative">
              <Input
                id="irDeck"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              {formData.irDeck && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-2" />
                  {formData.irDeck.name}
                </div>
              )}
            </div>
            {errors.irDeck && (
              <p className="text-sm text-red-500">{errors.irDeck as string}</p>
            )}
            <p className="text-xs text-gray-500">
              PDF 파일만 업로드 가능 (최대 10MB)
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  제출 중...
                </>
              ) : (
                '제출하기'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}