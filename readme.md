This repo is for sorting the filings from the 1201 proceeding. Run it with `npm start` and then launch `http://localhost:3000`. If you want to do your own sorting, just delete everything in the /sorted folder and get to it! 

# Overview

The folder original_documents has the filings from the proceeding organized by proceeding year and round.  For example, the folder original_documents/2012_round2 has all of the filings from the second commenting round of the 2012 proceeding.

The goal of the project is to copy these documents into a new file structure.  That structure is as follows:

- each year represented in original_documents gets it own folder
- within that year's folder there is a standard set of subfolders:
    - All-non-prohibited uses
    - AV-accessibility
    - AV-comment
    - AV-data_access
    - AV-edu
    - AV-shifting
    - CP-automated
    - CP-data_access
    - CP-diagnosis
    - CP-jailbreaking
    - CP-preservation
    - CP-security
    - CP-shifting
    - CP-unlocking
    - LW-accessibility
    - LW-data_access
    - LW-shifting

within each of these folders, there are two additional folders:
- proponents
- opponents

So for example, one path will be:
/2012/AV-accessibility/opponents

# App
The files in original_documents will need to be individually manually reviewed and sorted.  That is a tedious task with a file browser and file reader.  Therefore, we will build an app that:

1. Opens the PDF and displays the file path
2. Allows the viewer to click on a button to direct the file to the appropriate folder
3. Copy the file to the new folder in response to the button
4. Keep track of which files have been examined in a way that survives closing the application 
5. Move through the original_documents file structure in a logical manner
6. Displays the percentage of documents reviewed

I believe that the easiest way to do this will be to build some sort of javascript app, but am open to suggestions.  This app will only run locally in this repo, which is the same folder that contains the original_documents folder. 


# Category notes

- All-non-prohibited uses
- AV-accessibility
- AV-comment
    - Commentary & noncommercial uses (beyond just shifting)
- AV-data_access
- AV-edu
- AV-shifting
    - HDMI decryption is here because the reason to access is to do something else with the content
    - All general access to works comments go here because shifting is a catch-all way to describe using works
    - Includes archiving, even by institutions like libraries
    - All "use DVD on linux" also go here
- CP-automated
    - in retrospect, this is probably the same as data_access
- CP-data_access
    - includes access to data held in databases (like medical data)
    - also includes all data from medical devices (even though some of those petitions are framed as relating to literary works)
    - includes broad AI research access to CPs
- CP-diagnosis
    - This includes maintenance, repair, and interoperability 
    - this includes investigating license violations
- CP-jailbreaking
    - This includes 3D printer filament
- CP-preservation
- CP-security
- CP-shifting
- CP-unlocking
- LW-accessibility
- LW-data_access
    - this is data mining of texts
- LW-shifting