package seeder

func RunStaticSeed() error {
	if err := SeedRegion(); err != nil {
		return err
	}
	return nil
}

func RunSeed() error {

	if err := SeedRegion(); err != nil {
		return err
	}

	if err := SeedEmergencyTypes(); err != nil {
		return err
	}

	if err := SeedAvailableRegion(); err != nil {
		return err
	}

	if err := SeedEmergency(); err != nil {
		return err
	}
	return nil
}
