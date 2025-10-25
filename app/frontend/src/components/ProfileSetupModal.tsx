import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileSetupModalProps {
  open: boolean;
  onSave: (name: string) => void;
}

export default function ProfileSetupModal({ open, onSave }: ProfileSetupModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(trimmedName);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic input sanitization
    const value = e.target.value.replace(/[<>]/g, '');
    setName(value);
  };

  return (
    <Dialog open={open}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        aria-describedby="profile-setup-description"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Welcome to GreenCart</DialogTitle>
            <DialogDescription id="profile-setup-description">
              Please enter your name to complete your profile setup.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={handleNameChange}
                autoFocus
                maxLength={100}
                aria-required="true"
                aria-invalid={!name.trim()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Save Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
