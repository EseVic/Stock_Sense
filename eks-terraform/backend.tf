terraform {
  backend "s3" {
    bucket  = "stocksense-tfstate"
    key     = "stocksense/eks/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}