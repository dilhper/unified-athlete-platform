'use client'

import { useState } from 'react'
import { redirect } from 'next/navigation'

export default function RegisterRedirectPage() {
  redirect('/register')
}
                onChange={handleInputChange}
                disabled={isLoading || !!success}
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">
                Mobile Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isLoading || !!success}
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">
                Role
              </Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={isLoading || !!success}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {roles.find(r => r.value === formData.role)?.description}
              </p>
            </div>

            {/* Athlete Type Selection - Only for Athletes */}
            {formData.role === 'athlete' && (
              <div className="space-y-2">
                <Label htmlFor="athleteType" className="text-foreground">
                  Athlete Type
                </Label>
                <select
                  id="athleteType"
                  name="athleteType"
                  value={formData.athleteType}
                  onChange={handleInputChange}
                  disabled={isLoading || !!success}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="student">School Student</option>
                  <option value="university">University Student</option>
                  <option value="normal">Non-Student Athlete</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {formData.athleteType === 'normal' 
                    ? 'You will need to upload a copy of your NIC'
                    : 'You will need to upload your student record book'}
                </p>
              </div>
            )}

            {/* Document Verification for Athletes, Coaches and Specialists */}
            {requiresVerification && (
              <div className="space-y-3 p-4 border border-primary/30 rounded-lg bg-primary/5">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-foreground font-semibold">
                      Document Verification Required
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.role === 'athlete' 
                        ? formData.athleteType === 'normal'
                          ? 'Upload a clear copy of your National Identity Card (NIC)'
                          : 'Upload your student record book (all relevant pages)'
                        : formData.role === 'coach' 
                        ? 'Upload coaching certifications, licenses, or credentials'
                        : 'Upload professional licenses, certifications, or credentials'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documents" className="text-foreground text-sm cursor-pointer">
                    <div className="flex items-center gap-2 p-3 border-2 border-dashed border-border rounded-md hover:border-primary hover:bg-primary/5 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Upload Documents (PDF, JPG, PNG)</span>
                    </div>
                  </Label>
                  <Input
                    id="documents"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={isLoading || !!success}
                    className="hidden"
                  />
                  
                  {documents.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {documents.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded-md text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                            className="h-6 px-2 text-xs"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="py-2 px-3">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Your account will be pending until an admin reviews and approves your documents.
                    </p>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading || !!success}
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isLoading || !!success}
                className="bg-input border-border focus:ring-primary"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading || !!success}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
